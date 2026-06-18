---
title: Troubleshooting Your Installation
description: Common installation failure modes and how to diagnose them.
sidebar_position: 380
---

# Troubleshooting Your Installation

<!-- WRITER NOTE: Source: archive/installing/troubleshoot.md. Rewrite to Solace style. Do NOT copy/paste. -->

If you encounter issues during installation or initial startup, use the following guidance to diagnose and resolve the problem. For issues with a deployment that is already running, see [Troubleshooting a Running Deployment](../administering/scenario-troubleshooting.md).

## Agent Mesh Does Not Start

<!-- WRITER NOTE: Cover: missing or invalid LLM API key, missing configuration file, port already in use. Include the exact error message or log output that indicates each cause, then the steps to resolve it. -->

[Describe what the user sees — for example, "Agent Mesh exits immediately after startup. The terminal displays the following error: `[exact error message here]`."]

- [Check whether the LLM API key is set — for example, run `echo $ANTHROPIC_API_KEY`. If no value prints, export the variable and restart.]
- [Check whether the configuration file exists and is valid — for example, describe the relevant error message and how to fix a YAML parse error.]
- [Check whether the port is already in use — for example, describe the relevant error message and how to identify and free the port.]

## Cannot Connect to the Event Broker

<!-- WRITER NOTE: Cover: incorrect host/port, wrong credentials, wrong Message VPN name, TLS handshake failures, network/firewall issues. Does not apply to the desktop bundle. Include exact error messages from the log. -->

[Describe what the user sees — for example, "The startup log contains `[connection error message]` and agents do not come online."]

- Verify network connectivity to the event broker:

  ```bash
  nc -zv [broker-host] [broker-port]
  ```

  If the connection is refused or times out, the event broker is not reachable from this host. Check firewall rules or verify the host and port in your configuration file.

- [Run `sam-enterprise doctor` to check the full broker configuration. Describe what the output shows for each type of credential or configuration error.]
- [Describe how to resolve TLS handshake failures — for example, verifying the trust store configuration.]

## LLM Calls Are Failing

<!-- WRITER NOTE: Cover: invalid or expired API key, wrong model name, network unreachability to the LLM provider endpoint, rate limiting. Include exact log output. -->

[Describe what the user sees — for example, "Agents return an error response instead of an answer. The log contains `[LLM error message]`."]

- Verify the API key is set in the current shell session:

  ```bash
  echo $[PROVIDER_API_KEY_VAR]
  ```

  If no value prints, export the variable and restart Agent Mesh.

- [Verify the model name is correct — for example, describe the error that appears when the model string is invalid.]
- [Verify outbound HTTPS access to the LLM provider endpoint — for example, using curl. Describe how to identify a firewall or proxy block.]

## The Web UI Does Not Load

<!-- WRITER NOTE: Cover: Web UI gateway not configured, port-forward not running (Kubernetes), container not exposing the correct port (Docker), browser cache issues. Include the expected URL format. -->

[Describe what the user sees — for example, "Navigating to `http://localhost:8800` returns a connection refused error or a blank page."]

- Confirm Agent Mesh is running and the health endpoint is responding:

  ```bash
  curl -fsS http://localhost:[port]/health
  ```

  If the health check fails, Agent Mesh is not running or is not bound to the expected port.

- [Verify the `gateway_id` and `fastapi_port` fields in your gateway configuration file.]
- [For Kubernetes deployments, confirm the port-forward command is running and targeting the correct service and port.]
- [For Docker deployments, confirm the container exposes the correct port and the port mapping is correct.]

## Kubernetes Pods Are Not Starting

<!-- WRITER NOTE: Cover: image pull failures, resource limits, missing secrets, PersistentVolumeClaim not bound. Include the exact kubectl commands to check status and events. -->

[Describe what the user sees — for example, "One or more pods remain in `Pending` or `ImagePullBackOff` status after the Helm install completes."]

- Check pod status and events:

  ```bash
  kubectl get pods -n [namespace]
  kubectl describe pod [pod-name] -n [namespace]
  ```

  The `Events` section of the describe output identifies the specific failure.

- [For image pull errors, describe how to verify registry credentials and image availability.]
- [For `Pending` status, describe how to check resource limits and node capacity.]
- [For PersistentVolumeClaim issues, describe how to check PVC status and storage class availability.]

## Next Steps

If you can't resolve the issue with this guide, see [Get Support](https://docs.solace.com/get-support.htm).
