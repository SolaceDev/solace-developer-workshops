---
title: Targets and Authentication
description: Point sam config at a Platform service and sign in, from a local unauthenticated instance to an OIDC deployment or a CI pipeline.
sidebar_position: 3
---

# Targets and Authentication

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

Every `plan`, `apply`, and `pull` runs against a *target*: the Platform service to reconcile. This page covers choosing a target and authenticating to it. For the manifest that can carry a default target, see [The Manifest](./the-manifest.md).

## Choosing a Target

You can set the target three ways, in order of precedence:

1. `--url` on the command line, the explicit platform URL.
2. `--target`, a named entry you signed in to with `sam auth login`.
3. The manifest's `target.url`.

Both `--url` and `--target` override the manifest's `target.url`, so one manifest can reconcile a local instance during development and a cluster in CI without editing the file:

```bash
sam config apply -m manifest.yaml                              # uses the manifest's target.url
sam config apply -m manifest.yaml --url https://staging.example.com   # overrides it
sam config apply -m manifest.yaml --target prod                # uses the cached prod login
```

## A Local Instance Needs No Login

A local desktop instance is unauthenticated. Point the manifest at it and apply with no sign-in step:

```yaml
# manifest.yaml
target:
  url: http://127.0.0.1:8800
```

## Signing in to a Deployment

For a deployment with sign-in enabled, declare an OAuth target in the manifest and log in once:

```yaml
# manifest.yaml
target:
  name: prod
  url: https://platform.example.com
  auth:
    type: oauth
```

```bash
sam auth login prod --url https://platform.example.com
```

The login opens a browser, completes the sign-in flow, and caches the token under the target name. Later `plan`, `apply`, and `pull` runs read that cached token, and refresh it automatically when it expires, so you sign in once rather than per command. The login waits up to 90 seconds for the browser callback; change that with `--timeout`.

A few companion commands manage cached logins:

```bash
sam auth status prod    # show the cached token status and expiry for a target
sam auth list           # list every target you have a cached login for
sam auth logout prod    # revoke and delete the cached credentials for a target
```

:::note
`sam auth login` requires HTTPS. A bare hostname is upgraded to `https://`, and an `http://` URL is rejected, so a cached token is never sent over an unencrypted connection.
:::

## Bearer Tokens

To authenticate with a bearer token instead of the browser flow, set the target's `auth.type` to `bearer_token` and name the environment variable that holds the token:

```yaml
# manifest.yaml
target:
  name: prod
  url: https://platform.example.com
  auth:
    type: bearer_token
    envVar: PLATFORM_TOKEN
```

`sam config` reads the token from `PLATFORM_TOKEN` at run time, so the secret stays in the environment and never in the file.

## CI and the SAM_PLATFORM_TOKEN Override

The `SAM_PLATFORM_TOKEN` environment variable is the highest-priority credential. When it is set, it overrides the cached OAuth token and any bearer-token variable, so a pipeline can supply a service token without changing a manifest that declares an `oauth` target. The full precedence is:

1. `SAM_PLATFORM_TOKEN`, if set.
2. A cached OAuth token from `sam auth login`.
3. The bearer-token variable named by the target's `auth.envVar`.
4. Anonymous, for an unauthenticated local instance.

For a non-interactive run, pass `--no-interactive` so the command fails fast instead of trying to open a browser when no token is available:

```bash
SAM_PLATFORM_TOKEN="${SAM_PLATFORM_TOKEN}" \
  sam config apply -m manifests/prod.yaml --no-interactive
```

## Version and Schema Guardrails

Before it changes anything, `sam config` checks that the CLI and the Platform service are compatible. If the CLI is a full major version behind the platform, the command stops; a smaller lag prints a warning and continues. It also warns once if the platform returns fields the CLI does not recognize, the signal that the CLI is older than the platform and should be upgraded.

To skip the version check, pass `--skip-version-check` or set `SAM_SKIP_VERSION_CHECK=1`. Skip it only when you understand the mismatch, because a CLI that is too old can misread the platform's responses.

## Loading Environment Variables

`sam config` auto-loads a `.env` file from the nearest ancestor directory before it resolves `${VAR}` references, so local development picks up credentials without exporting them by hand. Add more files with `--env-file` (repeatable), or opt out of the automatic `.env` load with `--no-dotenv`. For how those variables feed substitution, see [Secrets and Variables](./secrets-and-variables.md).

## Related Topics

- [The Manifest](./the-manifest.md) covers the `target` block in the manifest.
- [Planning and Applying Changes](./planning-and-applying.md) covers running `plan` and `apply` once a target is set.
- [Secrets and Variables](./secrets-and-variables.md) covers `${VAR}` substitution and Vault references.
