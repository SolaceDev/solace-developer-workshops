---
title: SQL Connectors via the CLI
description: Configure a SQL connector as declarative YAML and apply it with the Agent Mesh CLI, so agents can query PostgreSQL, MySQL, MariaDB, Microsoft SQL Server, or Oracle through natural language.
sidebar_position: 2
---

# SQL Connectors via the CLI

A SQL connector lets agents query a database through natural language: the connector converts a user's question into SQL, runs it, and returns the result in conversational form. You define the connector as a declarative config resource and apply it with the Agent Mesh CLI, instead of using the Agent Mesh UI. To configure the same connector in the UI, and to read about the supported database types and the database-permission grants you should configure first, see [SQL Connectors](./index.md).

The following sections describe the YAML shape and the `sam config` command workflow.

Agent Mesh supports PostgreSQL, MySQL, MariaDB, Microsoft SQL Server, and Oracle. Each is a `subtype` of the `sql` connector type.

## Prerequisites

Before you author a SQL connector, ensure you have the following:

- A running database server that Agent Mesh can reach over the network
- The database name (or, for Oracle, the service name), the host, and the port if it is not the default for the database type
- A database username and password granting only the permissions agents need, such as `SELECT` on specific tables for a read-only assistant. For example grants, see [Database Permission Configuration](./index.md#database-permission-configuration)
- The `sam` CLI installed and a declarative config directory with a `manifest.yaml`. For more information, see [Platform Service](../../../concepts/platform-service.md)

## Creating the Connector

A SQL connector is one resource in a declarative config directory. To create the connector, perform the following steps:

1. Write the connector file under the `connectors/` directory, as described in [Connector YAML](#connector-yaml).
2. Reference the password through an environment variable, as described in [Referencing Secrets](#referencing-secrets).
3. Add the connector to the manifest and apply it, as described in [Applying the Connector](#applying-the-connector).

### Connector YAML

A connector is a single YAML file under the `connectors/` directory. The file declares the resource envelope (`kind`, `name`, and `description`) and a `spec` block that sets `type: sql`, the `subtype` for your database, and the connection details under `values`.

The example below is a PostgreSQL connector. The `password` is a secret. Reference it as a `${VAR}` placeholder rather than writing it into the file:

```yaml
# connectors/analytics-db.yaml
kind: connector
name: analytics-db
description: "Read-only analytics PostgreSQL database for reporting questions."
spec:
  type: sql
  subtype: postgres
  values:
    hostname: "db.example.com"
    port: 5432
    database: "analytics"
    username: "agent_readonly"
    password: ${ANALYTICS_DB_PASSWORD}
```

The `name` must be 3–255 characters and unique across all connectors in your deployment. The `description` is 10–1000 characters; the agent's language model reads it to decide when to query the database.

#### Common Fields

These fields apply to `postgres`, `mysql`, and `mariadb`:

| Field      | Required | Default                       | Description                                                        |
| ---------- | -------- | ----------------------------- | ------------------------------------------------------------------ |
| `hostname` | Yes      |                               | Database hostname or IPv4 address                                  |
| `port`     | No       | `5432` / `3306` / `3306`      | Port for the database type; defaults to the standard port          |
| `database` | Yes      |                               | Name of the database agents query                                  |
| `username` | Yes      |                               | Database user; its permissions determine what agents can access    |
| `password` | Yes      |                               | Password for the user (secret)                                     |

The default `port` depends on the subtype: `5432` for `postgres`, `3306` for `mysql` and `mariadb`, `1433` for `mssql`, and `1521` for `oracle`.

#### Oracle

Oracle uses `service_name` in place of `database`; every other field matches the common set:

```yaml
# connectors/orders-db.yaml
kind: connector
name: orders-db
description: "Oracle orders database for order-status questions."
spec:
  type: sql
  subtype: oracle
  values:
    hostname: "oracle.example.com"
    port: 1521
    service_name: "ORCLPDB1"
    username: "agent_readonly"
    password: ${ORDERS_DB_PASSWORD}
```

| Field          | Required | Description                                       |
| -------------- | -------- | ------------------------------------------------- |
| `service_name` | Yes      | Oracle service name (not the database name)        |

The Oracle driver is pure Go and does not require Oracle Client libraries on the host.

#### Microsoft SQL Server

SQL Server (`subtype: mssql`) adds two TLS fields on top of the common set:

```yaml
# connectors/reporting-db.yaml
kind: connector
name: reporting-db
description: "Microsoft SQL Server reporting database."
spec:
  type: sql
  subtype: mssql
  values:
    hostname: "mssql.example.com"
    port: 1433
    database: "reporting"
    username: "agent_readonly"
    password: ${REPORTING_DB_PASSWORD}
    encrypt: "yes"
    trust_server_certificate: "no"
```

| Field                      | Required | Default | Description                                                                                                                    |
| -------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `encrypt`                  | No       | `yes`   | TLS mode: `yes`, `no`, or `strict`. `strict` enforces TLS and always validates the certificate, ignoring `trust_server_certificate` |
| `trust_server_certificate` | No       | `no`    | `no` validates the server certificate (recommended); `yes` skips validation. Use `yes` only for development or self-signed certificates |

### Referencing Secrets

Never write the password into the YAML file. The `password` field takes a `${VAR}` placeholder that the Agent Mesh CLI substitutes from the environment at apply time. Set the variable before you run `sam config apply`. The Agent Mesh CLI also loads a `.env` file from the nearest ancestor directory, so you can keep the value there instead of exporting it:

```bash
export ANALYTICS_DB_PASSWORD="your-db-password"
```

Use the `${VAR, default}` form to supply a fallback when the variable is unset. When you run `sam config pull` to export an existing connector, the Agent Mesh CLI rewrites the password back to a `${VAR}` placeholder, so a pulled repository never contains a live credential.

### Applying the Connector

List the connector under `resources.connectors` in the manifest, alongside any agents that use it:

```yaml
# manifest.yaml
kind: manifest
name: my-deployment
description: Connectors and the agents that use them.
target:
  url: https://platform.example.com
resources:
  connectors:
    - analytics-db
  agents:
    - my-agent
```

Validate your changes without affecting the Platform service, then apply them when you are ready:

```bash
sam config plan
sam config apply
```

`sam config plan` shows the connectors and agents that would be created, updated, or deleted. `sam config apply` reconciles the Platform service to match the manifest; it creates and updates resources but does not delete anything unless you pass `--prune`. Create the connector before the agent that references it. An agent that names a connector missing from the Platform service fails to deploy.

| Command             | Description                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `sam config plan`   | Preview the changes an apply would make, without changing the Platform service  |
| `sam config apply`  | Create and update the manifest's resources on the Platform service             |
| `sam config pull`   | Export the Platform service's live config into editable YAML, secrets redacted  |

For the full command reference, see [Platform Service](../../../concepts/platform-service.md).

## Security Considerations

SQL connectors use a shared credential model: any user whose request reaches the agent can run any query the database user is permitted to run. Use a read-only database user and grant access only to the tables, columns, or views that agents need. For example grants per database type, see [Database Permission Configuration](./index.md#database-permission-configuration). For more information about the shared-credential model, see [Configuring Connectors](../index.md).

## Troubleshooting

The following tips might help you resolve issues with a SQL connector applied from the Agent Mesh CLI.

### Apply Fails to Substitute the Password

Check the following:

- The environment variable named in the `${VAR}` placeholder is set, or defined in a `.env` file the Agent Mesh CLI loads
- You ran `sam config apply` in a shell where the variable is exported

### Database Connection Fails

Check the following:

- Network connectivity to the database host and port works, and firewall rules allow traffic from Agent Mesh
- The `username` and `password` are correct
- The `database` (or, for Oracle, the `service_name`) exists
- The `subtype` matches your database server
- The `hostname` is a hostname or IPv4 address; IPv6 literals are not accepted

### Microsoft SQL Server Certificate Validation Fails

When `trust_server_certificate` is `no`, connections can fail with a certificate-validation error because Agent Mesh does not trust the SQL Server certificate. Either set `trust_server_certificate` to `yes` for development and self-signed certificates, or install the signing CA certificate into the Agent Mesh trust store. For more information, see [Microsoft SQL Server Certificate Validation Fails](./index.md#microsoft-sql-server-certificate-validation-fails).

## What Next?

After you apply a SQL connector, reference it from an agent so the agent can query the database during conversations. For more information, see [Creating Agents with the CLI](../../agents/cli.md).

To configure this connector in the Agent Mesh UI instead, see [SQL Connectors](./index.md).
