---
title: TLS
description: Configure TLS for the inbound HTTP/SSE gateway listener, the Solace broker connection, and outbound traffic to OIDC providers, LLM endpoints, and MCP servers.
sidebar_position: 5
---

# TLS

Agent Mesh has three independent TLS surfaces, each configured separately:

| Surface | What it secures | Where it lives |
|---|---|---|
| Inbound | Browser and CLI traffic to the gateway HTTP/SSE listener | Gateway YAML |
| Broker | The agent runtime's connection to the Solace event broker | Broker URL scheme + env |
| Outbound | The runtime's calls to OIDC providers, OAuth servers, LLM endpoints, and MCP servers | Per-consumer YAML |

You can configure any subset. A typical production deployment runs all three; a development deployment behind a terminating load balancer may only configure broker TLS and the load balancer handles inbound.

For where the certificate and key material lives (env vars, files on disk, mounted secrets), see Secrets management.

## Inbound: The Gateway HTTP/SSE Listener

The gateway accepts a PEM-encoded certificate and key via three keys on the gateway app config:

```yaml
# configs/gateways/webui.yaml
apps:
  - name: webui_gateway
    app_config:
      fastapi_host: 0.0.0.0
      fastapi_port: 8800
      fastapi_https_port: 8443
      ssl_certfile: /etc/sam/tls/server.crt
      ssl_keyfile: /etc/sam/tls/server.key
      ssl_keyfile_password: ${SSL_KEY_PASSWORD}
```

| Key | Purpose |
|---|---|
| `ssl_certfile` | Path to a PEM-encoded certificate chain (server cert first, then any intermediates) |
| `ssl_keyfile` | Path to the PEM-encoded private key |
| `ssl_keyfile_password` | Optional decryption password for PKCS#8 encrypted keys (`-----BEGIN ENCRYPTED PRIVATE KEY-----`) |
| `fastapi_https_port` | When set, the gateway runs in dual-port mode — `fastapi_port` serves plain HTTP, `fastapi_https_port` serves HTTPS |

The TLS listener uses **TLS 1.2 minimum**. Earlier TLS versions are refused.

### Encrypted Private Keys

The gateway supports PKCS#8 encrypted keys (`-----BEGIN ENCRYPTED PRIVATE KEY-----`). Plain unencrypted keys (`-----BEGIN PRIVATE KEY-----`, `-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN EC PRIVATE KEY-----`) are also accepted; `ssl_keyfile_password` is ignored in that case.

**Legacy DEK-Info encrypted keys are explicitly rejected** with the error `legacy DEK-Info encrypted keys are not supported; convert to PKCS#8 format`. If you see this error, convert the key:

```bash
openssl pkcs8 -topk8 -in legacy.key -out modern.key
```

You will be prompted for the legacy passphrase and a new PKCS#8 passphrase.

### Dual-Port Mode

When both `fastapi_port` and `fastapi_https_port` are set, the gateway binds two listeners — one plaintext, one TLS — on different ports. This is useful when an internal probe (Kubernetes liveness) needs plain HTTP while external traffic uses TLS, without standing up a second GWE pod.

If only `fastapi_port` is set and `ssl_certfile`/`ssl_keyfile` are provided, the gateway serves TLS on `fastapi_port` and the plain-HTTP listener is not created.

## Broker TLS (Solace)

Solace broker TLS is selected by URL scheme — no separate enable flag:

| URL scheme | Transport |
|---|---|
| `tcp://` | Plain TCP (SMF) |
| `tcps://` | TLS-wrapped TCP (SMF) |
| `ws://` | Plain WebSocket |
| `wss://` | TLS-wrapped WebSocket |

```yaml
# configs/agent.yaml
apps:
  - name: my_agent
    broker:
      broker_url: ${SOLACE_BROKER_URL, tcps://broker.example.com:55443}
      broker_username: ${SOLACE_BROKER_USERNAME}
      broker_password: ${SOLACE_BROKER_PASSWORD}
      broker_vpn: ${SOLACE_BROKER_VPN, default}
```

When the URL scheme is `tcps://` or `wss://`, the runtime configures the underlying Solace C SDK (CCSMP) to validate the broker certificate. The trust store is a directory of PEM files read by OpenSSL.

### Trust Store

The Solace C SDK uses OpenSSL, which requires a **file-based trust store**. The runtime reads the trust-store directory from `SOLACE_TLS_TRUST_STORE_DIR`, defaulting to `/etc/ssl/certs/` (the standard Linux system CA bundle directory):

```bash
export SOLACE_TLS_TRUST_STORE_DIR=/etc/ssl/certs/
```

On Linux this default works out of the box. On macOS the system trust roots live in the Keychain, which OpenSSL cannot read — you must either:

1. Set `SOLACE_TLS_TRUST_STORE_DIR` to a directory containing the relevant CA PEM files (e.g., from `brew install ca-certificates`), or
2. Use `tls_skip_verify: true` for local development only.

In containers, mount the trust store as a volume and set the env var to the mount path.

### Disabling Verification

Skip-verify is **not exposed on the generic agent `broker:` block** — the agent broker connection always validates the broker certificate against the trust store. If your dev broker has a self-signed certificate, mint the CA into a directory and point `SOLACE_TLS_TRUST_STORE_DIR` at it rather than disabling verification.

The Event Mesh gateway and the enterprise platform's connector configuration do expose a `tls_skip_verify` flag in their respective broker config blocks for development scenarios — see those surfaces' YAML reference for details.

## Outbound: OIDC Providers

Each OIDC provider in the `oidc_providers.yaml` catalog accepts two TLS keys:

```yaml
# configs/gwe/auth/oidc_providers.yaml
providers:
  keycloak:
    issuer: https://idp.example.com/realms/sam
    client_id: ${OIDC_CLIENT_ID}
    client_secret: ${OIDC_CLIENT_SECRET}
    ca_cert_path: ${OIDC_CA_CERT_PATH, }
    insecure_skip_verify: ${OIDC_INSECURE_SKIP_VERIFY, false}
```

| Key | Behavior |
|---|---|
| `ca_cert_path` | PEM file with additional CA certificates to trust. Appended to the system trust pool. |
| `insecure_skip_verify` | Disables certificate verification entirely. `ca_cert_path` is ignored when this is `true`. |

When `insecure_skip_verify` is true GWE logs a `WARN` at startup: `OIDC TLS certificate verification disabled — do not use in production`.

When `ca_cert_path` is set and the file cannot be read or contains no valid PEM blocks, GWE startup fails with a clear error. Setting both `ca_cert_path` and `insecure_skip_verify: true` is a configuration error in spirit — skip-verify wins and `ca_cert_path` is ignored with a second `WARN`.

This is the recommended path for an internal-CA-signed IdP, an IdP behind a corporate TLS-terminating proxy, or a local development KeyCloak/Dex instance with a self-signed certificate.

## Outbound: LLM Providers

LLM TLS is configured per-model under the `model:` block, with two keys:

```yaml
# configs/agent.yaml
apps:
  - name: my_agent
    app_config:
      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}
        # api_ca_cert: /etc/pki/llm-proxy-ca.pem
        # api_skip_tls_verify: true            # DEV ONLY
```

| Key | Behavior |
|---|---|
| `api_ca_cert` | PEM file with additional CA certificates the LLM client should trust |
| `api_skip_tls_verify` | Disables TLS verification entirely. `api_ca_cert` is ignored when this is `true`. |

When `api_skip_tls_verify: true` the runtime logs `TLS certificate verification disabled for LLM provider — do not use in production` at config-load time. Setting both keys logs `api_ca_cert is ignored when api_skip_tls_verify is true` and proceeds with skip-verify.

LLM providers in production are almost always behind public CAs, so these keys rarely need to be touched. They exist for development against a local proxy (LiteLLM, LocalAI) using a self-signed cert, or for an enterprise LLM endpoint fronted by an internal CA.

## Outbound: MCP Servers

MCP toolsets that connect over HTTPS (the streamable-http and SSE transports) configure TLS under a nested `ssl_config:` block in the connection params. The shape is per-toolset:

```yaml
# configs/agents/research.yaml
apps:
  - name: research_agent
    app_config:
      toolsets:
        - name: internal_mcp
          type: mcp
          connection_params:
            url: https://mcp.internal.example.com
            ssl_config:
              verify: true
              ca_bundle: /etc/pki/internal-ca.pem
              client_cert: /etc/pki/client.crt
              client_key: /etc/pki/client.key
              server_name: mcp.internal.example.com
```

| Key | Behavior |
|---|---|
| `verify` | Default `true`. Set to `false` to disable certificate verification entirely. |
| `ca_bundle` | PEM file with the CA chain the MCP server's cert chains to. Used in place of the system pool. |
| `client_cert` / `client_key` | Mutual-TLS — the client certificate Agent Mesh presents to the MCP server. Paired; setting only one is a configuration error caught at parse time. |
| `server_name` | SNI override. Use when the MCP endpoint's hostname differs from the certificate's CN/SAN (for example, when reaching it through a sidecar or sidecar-fronted internal address). |

mTLS (`client_cert` + `client_key`) composes with `ca_bundle` and `server_name` — common in enterprise deployments where both the server CA and the client identity are internally issued.

## Proxy Environment Variables

OIDC, OAuth2 client-credentials, and MCP outbound HTTPS traffic all honor the standard proxy environment variables listed below.

| Env var | Effect |
|---|---|
| `HTTPS_PROXY` | Route HTTPS traffic through this proxy URL. |
| `HTTP_PROXY` | Route HTTP traffic through this proxy URL. |
| `NO_PROXY` | Comma-separated hostnames or CIDRs that bypass the proxy. |
| `SSL_CERT_FILE` | Path to a single PEM file of trusted CA certificates. Appended to the system trust store and used to verify every outbound TLS connection that does not specify its own CA bundle via a per-consumer YAML knob. |
| `SAM_MCP_CONNECTOR_TLS_VERIFY` | When set to `false` (case-insensitive), disables TLS certificate verification for every MCP HTTP/SSE connector that does not set `ssl_config.verify` explicitly in its YAML. Per-connector YAML overrides this env var. Intended for development against MCP servers with self-signed certificates; the runtime logs a `WARN` at startup whenever this path is active. Stdio MCP transports ignore this variable — there is no TLS to skip. |

The inbound listener and broker connection are not affected by these variables — the broker connects directly to the broker URL using the Solace C SDK (which has its own trust-store mechanism, see Broker TLS), and the inbound listener accepts connections rather than making them. The LLM client (Bifrost) constructs its own HTTP transport internally; whether it honors these variables depends on the Bifrost version. If you need a forward proxy for LLM traffic specifically, verify against your deployment before relying on the env vars.

For air-gapped deployments behind a forward proxy, set `HTTPS_PROXY` on GWE and add internal hosts (broker, internal MCP servers) to `NO_PROXY`. If the proxy is a TLS-terminating MITM with its own CA, point `SSL_CERT_FILE` at the corp CA PEM so outbound HTTPS through the proxy validates correctly.

## Verifying TLS

After standing up TLS, verify each surface independently before pointing real traffic at it.

**Inbound gateway:**

```bash
curl --cacert /etc/pki/ca-bundle.crt https://sam.example.com/health
```

Expected response: HTTP 200 with body `ok`. Add `-v` to inspect the certificate chain the gateway returned.

**Broker:**

```bash
openssl s_client -connect broker.example.com:55443 -showcerts < /dev/null
```

Expected: a full certificate chain ending at a CA in your trust store, and `Verify return code: 0 (ok)` at the end. A non-zero verify code points at a missing intermediate or an untrusted root.

**OIDC provider:**

```bash
curl -v https://idp.example.com/.well-known/openid-configuration
```

Expected: HTTP 200 with the OIDC discovery JSON. A TLS verification failure here will surface as a startup error from the gateway once `ca_cert_path` is wired up.

## Troubleshooting

### `read TLS certificate: ...` on GWE Startup

The path in `ssl_certfile` or `ssl_keyfile` is unreadable. Check the file exists, GWE has read permission, and the path is absolute (or relative to the runtime working directory, which is usually not what you want — prefer absolute paths).

### `no PEM block found in key file`

The key file is empty, binary, or PEM-armored with no recognizable block header. Check the file with `openssl pkey -in keyfile -noout` — if `openssl` cannot read it either, the file is corrupt.

### `legacy DEK-Info encrypted keys are not supported; convert to PKCS#8 format`

Old-style encrypted keys (`Proc-Type: 4,ENCRYPTED` header) are deliberately rejected because the underlying decryption is weak. Convert as shown in Encrypted private keys.

### Broker Connects with `tcp://` but `tcps://` Hangs or Fails

The trust store is not where the Solace C SDK is looking. On Linux, confirm `/etc/ssl/certs/` exists and contains the relevant CA PEM file (typically `ca-certificates.crt` or a per-CA file). On macOS, set `SOLACE_TLS_TRUST_STORE_DIR` to a directory you control rather than relying on the Keychain. The Event Mesh gateway and the platform connector config support `tls_skip_verify: true` for a quick smoke test on those surfaces; the canonical agent broker connection requires the trust store to be set correctly.

### OIDC Discovery Fails with `x509: certificate signed by unknown authority`

The IdP's certificate chain is not validated against the gateway's trust pool. Either:

- Point `ca_cert_path` at a PEM file containing the missing intermediate or root CA, or
- For local development only, set `insecure_skip_verify: true`.

The `WARN` log message that fires with skip-verify on is intentional — it makes a misconfigured production deployment loudly visible.

### Different Outbound CAs Needed for OIDC vs LLM vs MCP

Each outbound consumer has its own CA-bundle knob (`ca_cert_path` for OIDC and OAuth2, `api_ca_cert` for LLM, `ssl_config.ca_bundle` for MCP) — there is no global override. If your OIDC server uses one CA and your LLM proxy uses another, configure each surface independently. This is intentional: a single global CA bundle would silently expand trust beyond the surface that needed it.

## What Next?

TLS is plumbed. Next, decide where the certificate and key material lives — file paths, environment variables, mounted secrets — in Secrets management. For who is allowed to reach the gateway endpoints once TLS is terminating, see RBAC reference.
