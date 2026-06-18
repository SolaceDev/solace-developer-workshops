---
title: Monitoring Your Deployment
description: Deploy-time observability setup — log format, OpenTelemetry metrics, and health endpoints.
sidebar_position: 370
---

# Monitoring Your Deployment

<!-- WRITER NOTE: Source: archive/installing/monitor.md. Rewrite to Solace style. Do NOT copy/paste. -->

This page covers the observability setup you configure at deployment time. For day-two monitoring and alerting after your deployment is running, see [Monitoring Your Agent Mesh](../administering/observability.md).

## Configure Log Output

<!-- WRITER NOTE: Numbered steps. Cover: setting LOG_FORMAT=json for structured logging (required for log aggregation), log level configuration, and how to verify logs are being emitted in the expected format. -->

1. Set the log format environment variable before starting Agent Mesh:

   ```bash
   export LOG_FORMAT=json
   ```

2. [Set the log level if you want to change the default — for example, `LOG_LEVEL=info`.]

3. [Start Agent Mesh.] Log output appears in the terminal as structured JSON, with each line containing a `level`, `msg`, and timestamp field.

## Configure OpenTelemetry Metrics

<!-- WRITER NOTE: Numbered steps. Cover: enabling the OTel metrics exporter, configuring the endpoint, and verifying metrics are being scraped. Include any Grafana dashboard references if applicable. -->

1. Add the OpenTelemetry exporter configuration to your configuration file:

   ```yaml
   [otel config block here]
   ```

2. [Start or restart Agent Mesh.] Metrics appear at your configured OTel collector endpoint and are visible in your metrics tool — for example, Prometheus or Grafana.

## Configure Health Endpoints

<!-- WRITER NOTE: Numbered steps. Cover: the health endpoint URL for each component, what a healthy response looks like, and how to wire these into Kubernetes liveness and readiness probes or a Docker health check. -->

1. Verify the health endpoint is responding after Agent Mesh starts:

   ```bash
   curl -fsS http://localhost:[port]/health
   ```

   A `200 OK` response with `{"status":"healthy"}` confirms all components are running correctly.

2. [Add the health endpoint to your Kubernetes liveness and readiness probe configuration, or to your Docker health check, using the URL and expected response above.]

## Next Steps

- For ongoing operational monitoring, see [Monitoring Your Agent Mesh](../administering/observability.md).
- For troubleshooting deployment issues, see [Troubleshooting Your Installation](./troubleshoot.md).
