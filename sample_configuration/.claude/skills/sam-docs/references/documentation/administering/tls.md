---
title: Configuring TLS
description: Configure TLS for the inbound HTTP/SSE Entrypoint listener, the Solace broker connection, and outbound traffic to OIDC providers, LLM endpoints, and MCP servers.
sidebar_position: 840
---

# Configuring TLS

Agent Mesh has three independent TLS surfaces, each configured separately:

| Surface | What it secures | Where it lives |
|---|---|---|
| Inbound | Browser and CLI traffic to the Entrypoint HTTP/SSE listener | Entrypoint app config |
| Broker | The runtime's connection to the Solace event broker | Broker URL scheme + trust store |
| Outbound | The runtime's calls to OIDC providers, OAuth servers, LLM endpoints, and MCP servers | Per-consumer config |

You can configure any subset. A typical production deployment runs all three; a development deployment behind a terminating load balancer may configure only broker TLS and let the load balancer handle inbound.

For where the certificate and key material lives (environment variables, files on disk, mounted secrets), see [Managing Secrets](./secrets-management.md).

## Inbound: The Entrypoint HTTP/SSE Listener

The Entrypoint accepts a PEM-encoded certificate and key via keys on its app config:

```yaml
# entrypoint runtime config
apps:
  - name: webui_entrypoint
    app_config:
      fastapi_host: 0.0.0.0
      fastapi_port: 8800
      fastapi_https_port: 8443
      ssl_certfile: /etc/sam/tls/server.crt
      ssl_keyfile: /etc/sam/tls/server.key
      ssl_keyfile_password: ${SSL_KEYFILE_PASSWORD}
```

| Key | Purpose |
|---|---|
| `fastapi_host` | Bind address for the listener. Defaults to `127.0.0.1` for the plain listener; the HTTPS listener binds `0.0.0.0` when the host is left blank. |
| `fastapi_port` | Plain-HTTP listen port. When no Entrypoint app sets this key, the listener falls back to `:8080`. |
| `fastapi_https_port` | When set, the Entrypoint runs in dual-port mode — `fastapi_port` serves plain HTTP, `fastapi_https_port` serves HTTPS. |
| `ssl_certfile` | Path to a PEM-encoded certificate chain (server cert first, then any intermediates). |
| `ssl_keyfile` | Path to the PEM-encoded private key. |
| `ssl_keyfile_password` | Optional decryption password for PKCS#8 encrypted keys (`-----BEGIN ENCRYPTED PRIVATE KEY-----`). |

When these keys are absent from YAML, the Entrypoint falls back to the environment variables `SSL_CERTFILE`, `SSL_KEYFILE`, `SSL_KEYFILE_PASSWORD`, and `FASTAPI_HTTPS_PORT`. YAML takes precedence over the environment; the environment takes precedence over "no TLS".

The TLS listener uses **TLS 1.2 minimum**. Earlier TLS versions are refused; TLS 1.3 is allowed.

The same six keys, with the same names, configure the inbound listener of the Platform service — it defaults to `fastapi_port: 8001` and `fastapi_https_port: 8444`.

### Encrypted Private Keys

The Entrypoint supports PKCS#8 encrypted keys (`-----BEGIN ENCRYPTED PRIVATE KEY-----`), decrypted with `ssl_keyfile_password`. Plain unencrypted keys (`-----BEGIN PRIVATE KEY-----`, `-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN EC PRIVATE KEY-----`) are also accepted; leave `ssl_keyfile_password` unset in that case.

**Legacy PEM-encrypted keys are explicitly rejected.** A key carrying the old `Proc-Type: 4,ENCRYPTED` / `DEK-Info` header fails startup with the error `legacy DEK-Info encrypted keys are not supported; convert to PKCS#8 format`. If you see this, convert the key:

```bash
openssl pkcs8 -topk8 -in legacy.key -out modern.key
```

You will be prompted for the legacy passphrase and a new PKCS#8 passphrase.

### Dual-Port Mode

When both `fastapi_port` and `fastapi_https_port` are set, the Entrypoint Executor binds two listeners — one plaintext, one TLS — on different ports. This is useful when an internal probe (Kubernetes liveness) needs plain HTTP while external traffic uses TLS, without standing up a second Entrypoint Executor.

When `ssl_certfile`/`ssl_keyfile` are provided but no `fastapi_https_port` is set, the Entrypoint serves TLS directly on `fastapi_port` (single-port TLS) and no plain-HTTP listener is created.

## Broker TLS (Solace)

Solace broker TLS is selected by URL scheme — there is no separate enable flag. The runtime enables the TLS transport whenever the broker URL begins with `tcps://` or `wss://`:

| URL scheme | Transport |
|---|---|
| `tcp://` | Plain TCP (Solace Message Format, SMF) |
| `tcps://` | TLS-wrapped TCP (SMF) |
| `ws://` | Plain WebSocket |
| `wss://` | TLS-wrapped WebSocket |

```yaml
# agent config
apps:
  - name: my_agent
    broker:
      broker_url: ${SOLACE_BROKER_URL, tcps://broker.example.com:55443}
      broker_username: ${SOLACE_BROKER_USERNAME}
      broker_password: ${SOLACE_BROKER_PASSWORD}
      broker_vpn: ${SOLACE_BROKER_VPN, default}
      trust_store_path: /etc/ssl/certs
```

When the scheme is `tcps://` or `wss://`, the runtime uses the Solace Go API to validate the event broker certificate. Broker authentication in Agent Mesh is username/password. Client-certificate (mutual-TLS) authentication to the broker is not currently exposed in the broker connection configuration.

### Trust Store

The Solace Go API links a native library that uses OpenSSL, which requires a **file-based trust store**: a directory of PEM Certificate Authority (CA) files. The runtime resolves the trust-store directory in this order:

1. The `trust_store_path` key on the `broker:` block (shown above).
2. The `SOLACE_TLS_TRUST_STORE_DIR` environment variable.
3. The `TRUST_STORE` environment variable.
4. On macOS only: an embedded Mozilla CA bundle, materialized to a temporary directory automatically.
5. The platform default — `/etc/ssl/certs` on Linux, `/etc/ssl` on macOS.

```bash
export SOLACE_TLS_TRUST_STORE_DIR=/etc/ssl/certs
```

On Linux the platform default validates against the system CA bundle with no configuration. On macOS the runtime ships and uses an embedded Mozilla CA bundle automatically, so broker TLS validates against public roots out of the box — no `brew install`, no manual bundle, no skip-verify. Set `trust_store_path` or `SOLACE_TLS_TRUST_STORE_DIR` only to trust a **private** CA, such as a broker with an internally issued certificate. In a minimal container image that ships no system CA bundle, mount one and point one of these knobs at it.

### Disabling Verification

The `broker:` block accepts `tls_skip_verify: true`, which turns off broker certificate validation entirely. It is for local development against a broker with a self-signed certificate; the runtime logs an insecure warning when it is active.

```yaml
# agent config
apps:
  - name: my_agent
    broker:
      broker_url: tcps://localhost:55443
      tls_skip_verify: true   # DEV ONLY
```

Prefer minting the dev broker's CA into a directory and pointing `trust_store_path` at it over disabling verification. The Platform service's connector-deployment path deliberately never emits `tls_skip_verify` — connector broker connections always validate.

## Outbound: OIDC Providers

Each provider in the OIDC catalog accepts two TLS keys. The catalog is a top-level `providers:` map, conventionally kept in its own file and pulled into the Entrypoint config with `!include`:

```yaml
# oidc_providers.yaml — included into the entrypoint config via !include
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

When `insecure_skip_verify` is true the Entrypoint logs a warning at startup: `OIDC TLS certificate verification disabled — do not use in production`.

When `ca_cert_path` is set and the file cannot be read or contains no valid PEM blocks, Entrypoint startup fails with a clear error. Setting both `ca_cert_path` and `insecure_skip_verify: true` is contradictory — skip-verify wins, `ca_cert_path` is ignored, and a second warning fires: `ca_cert_path is ignored when insecure_skip_verify is true`.

This is the recommended path for an internal-CA-signed IdP, an IdP behind a corporate TLS-terminating proxy, or a local development Keycloak/Dex instance with a self-signed certificate.

The same two key names (`ca_cert_path`, `insecure_skip_verify`) configure TLS for the OAuth2 client-credentials flows used by the MCP Entrypoint proxy and tool OAuth — each is an independent config block reusing the identical naming.

## Outbound: LLM Providers

LLM TLS is configured per-model under the `model:` block:

```yaml
# agent config
apps:
  - name: my_agent
    app_config:
      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}
        api_ca_cert: /etc/pki/llm-proxy-ca.pem
        api_skip_tls_verify: false   # DEV ONLY when true
```

| Key | Behavior |
|---|---|
| `api_ca_cert` | PEM file with additional CA certificates the LLM client should trust. |
| `api_skip_tls_verify` | Disables TLS verification entirely. `api_ca_cert` is ignored when this is `true`. |

Both knobs are threaded end-to-end into the LLM client's HTTP transport per model. When `api_skip_tls_verify: true` the runtime logs `TLS certificate verification disabled for LLM provider — do not use in production` at config-load time. Setting both keys logs `api_ca_cert is ignored when api_skip_tls_verify is true` and proceeds with skip-verify.

LLM providers in production are almost always behind public CAs, so these keys rarely need touching. They exist for development against a local proxy (LiteLLM, LocalAI) with a self-signed cert, or for an enterprise LLM endpoint fronted by an internal CA.

If the model reaches its provider through an OAuth2 token endpoint, that endpoint has its own paired TLS knobs on the same `model:` block — `oauth_ca_cert` and `oauth_skip_tls_verify` — with the same precedence (skip-verify wins, and a warning fires when both are set).

## Outbound: MCP Servers

MCP toolsets that connect over HTTPS (the `streamable-http` and `sse` transports) configure TLS under a nested `ssl_config:` block in the connection params:

```yaml
# agent config
apps:
  - name: research_agent
    app_config:
      toolsets:
        - name: internal_mcp
          type: mcp
          connection_params:
            type: streamable-http
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
| `verify` | Default `true`. Set to `false` to disable certificate verification entirely (logs a startup warning). |
| `ca_bundle` | PEM file with the CA chain the MCP server's cert chains to. Used in place of the system pool. |
| `client_cert` / `client_key` | Mutual-TLS — the client certificate Agent Mesh presents to the MCP server. Paired; setting only one is a configuration error caught at parse time (`mcp ssl_config: client_cert and client_key must be set together`). |
| `server_name` | Server Name Indication (SNI) override. Use when the MCP endpoint's hostname differs from the certificate's CN/SAN (for example, when reaching it through a sidecar-fronted internal address). |

The `ssl_config` block applies only to the HTTPS transports; a stdio MCP transport has no TLS to configure. mTLS (`client_cert` + `client_key`) composes with `ca_bundle` and `server_name`, which is common in enterprise deployments where both the server CA and the client identity are internally issued. The MCP TLS floor is also TLS 1.2.

## Proxy and TLS Environment Variables

OIDC, OAuth2 client-credentials, and MCP outbound HTTPS traffic all honor the standard Go proxy environment variables:

| Env var | Effect |
|---|---|
| `HTTPS_PROXY` | Route outbound HTTPS traffic through this proxy URL. |
| `HTTP_PROXY` | Route outbound HTTP traffic through this proxy URL. |
| `NO_PROXY` | Comma-separated hostnames or CIDRs that bypass the proxy. |
| `SSL_CERT_FILE` / `SSL_CERT_DIR` | On Linux/BSD, honored by the Go runtime's system certificate pool — `SSL_CERT_FILE` adds a single PEM CA file, `SSL_CERT_DIR` a directory of them — used for outbound TLS that does not specify its own CA bundle. **Not read by Agent Mesh directly, and not effective on macOS or Windows** (those platforms use the OS trust store and ignore these variables). For a portable per-surface trust anchor, use the YAML CA-bundle knobs (`ca_cert_path`, `api_ca_cert`, `ssl_config.ca_bundle`) instead. |
| `SAM_MCP_CONNECTOR_TLS_VERIFY` | When set to `false` (case-insensitive), disables TLS verification for every MCP HTTP/SSE connector that does not set `ssl_config.verify` explicitly. Per-connector YAML overrides this variable. Intended for development against MCP servers with self-signed certificates; the runtime logs a warning at startup whenever this path is active (`mcp TLS verification disabled via SAM_MCP_CONNECTOR_TLS_VERIFY=false — do not use in production`). Stdio MCP transports ignore this variable. |

The inbound listener and broker connection are not affected by these variables — the broker connects using the Solace Go API's own trust-store mechanism (see [Broker TLS (Solace)](#broker-tls-solace)), and the inbound listener accepts connections rather than making them.

For air-gapped deployments behind a forward proxy, set `HTTPS_PROXY` on the Entrypoint and add internal hosts (broker, internal MCP servers) to `NO_PROXY`. If the proxy is a TLS-terminating man-in-the-middle (MITM) with its own CA, point `SSL_CERT_FILE` (on Linux) at the corporate CA PEM so outbound HTTPS through the proxy validates correctly, or set the per-surface CA-bundle knob for the specific consumer.

## Verifying TLS

After standing up TLS, verify each surface independently before pointing real traffic at it.

**Inbound Entrypoint:**

```bash
curl --cacert /etc/pki/ca-bundle.crt https://sam.example.com/health
```

Expected response: HTTP 200 with a JSON body (`{"status":"A2A Web UI Backend is running"}`). Add `-v` to inspect the certificate chain the Entrypoint returned.

**Broker:**

```bash
openssl s_client -connect broker.example.com:55443 -showcerts < /dev/null
```

Expected: a full certificate chain ending at a CA in your trust store, and `Verify return code: 0 (ok)` at the end. A non-zero verify code points at a missing intermediate or an untrusted root.

**OIDC provider:**

```bash
curl -v https://idp.example.com/.well-known/openid-configuration
```

Expected: HTTP 200 with the OIDC discovery JSON. A TLS verification failure here surfaces as a startup error from the Entrypoint once `ca_cert_path` is wired up.

## Troubleshooting

### `legacy DEK-Info encrypted keys are not supported; convert to PKCS#8 format`

Old-style encrypted keys (`Proc-Type: 4,ENCRYPTED` header) are deliberately rejected because the underlying decryption is weak. Convert as shown in [Encrypted Private Keys](#encrypted-private-keys).

### `no PEM block found in key file`

The key file is empty, binary, or PEM-armored with no recognizable block header. Check it with `openssl pkey -in keyfile -noout` — if `openssl` cannot read it either, the file is corrupt.

### `proxy load TLS certificate: ...` on Entrypoint Startup

The path in `ssl_certfile` or `ssl_keyfile` is unreadable, or the key password is wrong. Confirm the files exist, the Entrypoint Executor has read permission, and the paths are absolute. Benign TLS handshake noise from clients is logged at debug level and does not fail startup — genuine misconfiguration surfaces at certificate-load time.

### Broker Connects with `tcp://` but `tcps://` Hangs or Fails

The trust store is not where the Solace Go API is looking, or it does not contain the broker's CA. On Linux and minimal container images, confirm `/etc/ssl/certs` exists and holds the relevant CA PEM file, or point `trust_store_path` / `SOLACE_TLS_TRUST_STORE_DIR` at a directory that does. On macOS the runtime uses its embedded Mozilla bundle automatically; if a `solace broker: embedded CA materialization failed` warning appears in the logs, set `trust_store_path` to a readable CA directory. For a broker with a private CA, point one of the trust-store knobs at that CA. For a quick smoke test against a self-signed dev broker, `tls_skip_verify: true` on the `broker:` block bypasses validation.

### OIDC Discovery Fails with `x509: certificate signed by unknown authority`

The IdP's certificate chain is not validated against the Entrypoint's trust pool. Either point `ca_cert_path` at a PEM file containing the missing intermediate or root CA, or — for local development only — set `insecure_skip_verify: true`. The warning that fires with skip-verify on is intentional: it makes a misconfigured production deployment loudly visible.

### Different Outbound CAs Needed for OIDC vs LLM vs MCP

Each outbound consumer has its own CA-bundle knob — `ca_cert_path` for OIDC and OAuth2, `api_ca_cert` for LLM, `ssl_config.ca_bundle` for MCP — and there is no global override. If your OIDC server uses one CA and your LLM proxy uses another, configure each surface independently. This is intentional: a single global CA bundle would silently expand trust beyond the surface that needed it.

## What Next?

TLS is plumbed. Decide where the certificate and key material lives — file paths, environment variables, mounted secrets — in [Managing Secrets](./secrets-management.md). For who is allowed to reach the Entrypoint endpoints once TLS is terminating, see [RBAC Reference](../reference/rbac-reference.md).
