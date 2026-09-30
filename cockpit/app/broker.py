"""SEMP client.

The browser never talks to SEMP directly. Proxying through the cockpit avoids
CORS and port-forwarding auth friction in Codespaces, keeps broker credentials
out of client-side JavaScript, and gives us one place to turn "connection
refused" into a message that tells an attendee the broker is still booting.
"""

import asyncio

import httpx

from .config import MSG_VPN, SEMP_BASE_URL, SEMP_MONITOR_BASE_URL, SEMP_PASSWORD, SEMP_USER

_TIMEOUT = httpx.Timeout(5.0, connect=2.0)


class BrokerUnavailable(Exception):
    """Raised when SEMP cannot be reached -- almost always because the broker
    container is still starting, which takes 30-60 seconds."""


async def semp_get(path: str, api: str = "config") -> dict:
    """GET a SEMP path. `path` is relative to /SEMP/v2/<api> and may contain
    {vpn}, which is substituted with the configured message VPN.

    `api` selects the tree: "config" for objects someone created, "monitor"
    for live counters such as queue depth, redelivery counts and connected
    clients. A monitor-only collection requested from /config returns 404, so
    a view that reads counters has to ask for the monitor tree explicitly."""
    base = SEMP_MONITOR_BASE_URL if api == "monitor" else SEMP_BASE_URL
    url = base + path.format(vpn=MSG_VPN)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, auth=(SEMP_USER, SEMP_PASSWORD))
    except httpx.RequestError as exc:
        raise BrokerUnavailable(str(exc)) from exc

    if resp.status_code == 401:
        raise BrokerUnavailable("SEMP rejected the configured credentials")
    resp.raise_for_status()
    return resp.json()


async def semp_delete(path: str) -> str:
    """DELETE a config object. Returns "deleted", "absent" when the broker has
    no such object (so clearing twice is not an error), or the broker's own
    error text."""
    url = SEMP_BASE_URL + path.format(vpn=MSG_VPN)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.delete(url, auth=(SEMP_USER, SEMP_PASSWORD))
    except httpx.RequestError as exc:
        raise BrokerUnavailable(str(exc)) from exc
    if resp.status_code == 200:
        return "deleted"
    try:
        status = resp.json().get("meta", {}).get("error", {}).get("status", "")
    except ValueError:
        status = ""
    if resp.status_code == 404 or status == "NOT_FOUND":
        return "absent"
    return f"{resp.status_code} {status or resp.text[:200]}"


async def health() -> dict:
    """Readiness probe the UI polls while the broker container boots."""
    try:
        data = await semp_get("/msgVpns/{vpn}")
    except BrokerUnavailable as exc:
        return {"ready": False, "reason": str(exc)}
    except httpx.HTTPStatusError as exc:
        return {"ready": False, "reason": f"SEMP returned {exc.response.status_code}"}

    vpn = data.get("data", {})
    return {
        "ready": True,
        "msgVpn": vpn.get("msgVpnName"),
        "enabled": vpn.get("enabled"),
        "clients": vpn.get("counter", {}).get("connectionCount"),
    }


async def overview() -> dict:
    """Counts the cockpit shows in its status strip. Each piece is optional --
    a broker mid-boot may answer some calls and not others, and a partial
    overview is more useful to an attendee than an error."""
    out = {"queues": None, "clientProfiles": None, "aclProfiles": None,
           "clientUsernames": None}
    probes = {
        "queues": "/msgVpns/{vpn}/queues?count=100",
        "clientProfiles": "/msgVpns/{vpn}/clientProfiles?count=100",
        "aclProfiles": "/msgVpns/{vpn}/aclProfiles?count=100",
        "clientUsernames": "/msgVpns/{vpn}/clientUsernames?count=100",
    }

    # Concurrent, not serial: while the broker boots each call can sit on the
    # full read timeout, and four of those in a row stall the status strip.
    async def probe(key: str, path: str) -> None:
        try:
            data = await semp_get(path)
            out[key] = len(data.get("data", []))
        except Exception:
            pass

    await asyncio.gather(*(probe(k, p) for k, p in probes.items()))
    return out


async def exists(path: str) -> bool:
    """Does this SEMP object exist?

    SEMP reports a missing object as HTTP 400 with meta.error.status set to
    NOT_FOUND, not as a 404, so the status field is what decides. Absence is a
    normal answer here -- it means the attendee has not created that object yet.
    """
    url = SEMP_BASE_URL + path.format(vpn=MSG_VPN)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, auth=(SEMP_USER, SEMP_PASSWORD))
    except httpx.RequestError as exc:
        raise BrokerUnavailable(str(exc)) from exc

    if resp.status_code == 200:
        return True
    if resp.status_code == 401:
        raise BrokerUnavailable("SEMP rejected the configured credentials")

    try:
        status = resp.json().get("meta", {}).get("error", {}).get("status")
    except ValueError:
        status = None
    if status == "NOT_FOUND" or resp.status_code == 404:
        return False

    resp.raise_for_status()
    return False
