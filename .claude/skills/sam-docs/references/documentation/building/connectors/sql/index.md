---
title: SQL Connectors
description: Configure SQL connectors so agents can query MySQL, PostgreSQL, MariaDB, Microsoft SQL Server, or Oracle databases through natural language.
sidebar_position: 1
---

# SQL Connectors

SQL connectors let agents query and analyze database information using natural language. The connector converts a user's question into a SQL query, runs it against your database, and returns the result in conversational form, so users query the database through an agent without writing SQL. The connector opens a connection for each query and closes it when the query completes, handling the SQL dialect, connection protocol, and driver for each database type automatically.

Agent Mesh supports the following database types, each using the same configuration form with connection parameters appropriate for that system:

- MySQL
- PostgreSQL
- MariaDB
- Microsoft SQL Server (MSSQL)
- Oracle

## Prerequisites

Before you create a SQL connector, ensure you have the following:

- A running database server that Agent Mesh can reach over the network, configured to accept connections from the deployment's network or IP address range
- The name of the database that agents query. Agents always use the database's default schema (`public` for PostgreSQL, `dbo` for SQL Server)
- A database username and password granting only the permissions agents need, such as `SELECT` on specific tables for a read-only assistant. For example grants, see [Database Permission Configuration](#database-permission-configuration)
- Network connectivity from Agent Mesh to the database server on its port, with firewalls and security groups permitting the traffic. Default ports are `3306` (MySQL, MariaDB), `5432` (PostgreSQL), `1433` (MSSQL), and `1521` (Oracle)

## Creating a SQL Connector

To create a SQL connector:

1. In the Agent Mesh UI, go to the **Connectors** page and click **Create Connector**.
2. Select the database type: **PostgreSQL**, **MySQL**, **MariaDB**, **Microsoft SQL Server**, or **Oracle**. This choice determines the driver and connection string format.
3. Enter a **Connector Name** that is unique across all connectors in your deployment. You can rename it later.
4. Enter a **Description** of 10–1000 characters. The agent's language model uses this text to decide when to query the database.
5. Enter the **Database Name** the agents query. For Oracle, enter the **Service Name** instead. Allowed characters are letters, digits, `_`, and `$` (Oracle also allows `.`).
6. Enter the **Database Host**—the hostname or IPv4 address of the server (for example, `db.example.com`). IPv6 literals are not accepted.
7. Enter the **Port** if the database does not use the default for its type.
8. Enter the **Username** and **Password**. The user's permissions determine which tables and operations agents can access.
9. For Microsoft SQL Server, set the TLS fields described below.
10. Click **Create** to save the connector.

### Microsoft SQL Server TLS Fields

| Field                    | Required | Description                                                                                                                                                                                       |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encryption (TLS)         | No       | `Enabled` (default), `Disabled`, or `Strict`. `Strict` enforces TLS and always validates the server certificate, ignoring the Trust Server Certificate field                                      |
| Trust Server Certificate | No       | Visible only when Encryption is `Enabled`. `Disabled` (default) validates the certificate; `Enabled` skips validation. Use `Enabled` only for development or self-signed certificates             |

The Oracle driver is pure Go and does not require Oracle Client libraries on the host.

## Database Permission Configuration

Configure database permissions before you create the connector. The database user's permissions determine what agents can read or modify.

### Read-Only Access

For most use cases, grant read-only access. Read-only access lets agents answer questions without risking accidental or malicious data modification.

The grants below use the `${DB_PASSWORD}` placeholder. Substitute the actual password at deploy time and store it in a secret manager—never commit the literal value to source control.

**MySQL and MariaDB:**

```sql
CREATE USER 'agent_readonly'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT ON your_database.* TO 'agent_readonly'@'%';
FLUSH PRIVILEGES;
```

**PostgreSQL:**

```sql
CREATE USER agent_readonly WITH PASSWORD '${DB_PASSWORD}';
GRANT CONNECT ON DATABASE your_database TO agent_readonly;
GRANT USAGE ON SCHEMA public TO agent_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO agent_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO agent_readonly;
```

**Microsoft SQL Server:**

```sql
CREATE LOGIN agent_readonly WITH PASSWORD = '${DB_PASSWORD}';
USE your_database;
CREATE USER agent_readonly FOR LOGIN agent_readonly;
GRANT SELECT ON SCHEMA::dbo TO agent_readonly;
```

**Oracle:**

```sql
CREATE USER agent_readonly IDENTIFIED BY ${DB_PASSWORD};
GRANT CREATE SESSION TO agent_readonly;
GRANT SELECT ANY TABLE TO agent_readonly;
```

For tighter access control, grant `SELECT` on individual tables rather than `SELECT ANY TABLE`:

```sql
GRANT SELECT ON your_schema.your_table TO agent_readonly;
```

After you create the connector, it is available to assign to agents. For information about assigning, editing, and deleting connectors, see [Configuring Connectors](../index.md).

## Security Considerations

SQL connectors use a shared credential model. For more information, see [Configuring Connectors](../index.md).

Any user whose request reaches the agent can run any query the database user is permitted to run. Use a read-only database user and grant access only to the tables, columns, or views that agents need.

## Troubleshooting

The following troubleshooting tips might help you to resolve issues with this connector.

### Database Connection Fails

Check the following:

- Network connectivity to the database host and port works
- Firewall rules allow traffic from Agent Mesh
- The username and password are correct
- The database name exists
- The database type selection matches your server

### Supabase PostgreSQL Connection Errors

When connecting to PostgreSQL databases hosted on Supabase, you might encounter network errors:

```json
{ "detail": "Invalid token", "error_type": "invalid_token" }
```

This occurs because the Supabase direct connection endpoint uses IPv6 addressing, but most Agent Mesh deployments default to IPv4 networking. Use the Session Pooler endpoint instead because it is IPv4 compatible.

In your Supabase project settings, navigate to Database then Connection Pooling to find the Session Pooler connection string. Use the host and port from this connection string when configuring your SQL connector. The database name, username, and password remain the same as your direct connection credentials.

### Microsoft SQL Server Certificate Validation Fails

When connecting to SQL Server with `Trust Server Certificate` set to **Disabled**, you might see certificate validation errors:

```text
SSL Provider: certificate verify failed: unable to get local issuer certificate
```

The Agent Mesh container does not trust the SQL Server certificate. To resolve this, use one of the following options:

- **Enable Trust Server Certificate**—set `Trust Server Certificate` to **Enabled** in the connector configuration. This bypasses certificate validation, which is appropriate for self-signed certificates in development environments
- **Install the CA certificate**—install the CA certificate that signed the SQL Server certificate into the Agent Mesh container's trust store. For instructions, see [Trust Custom CA Certificates](../../../installing/kubernetes/production.md#trust-custom-ca-certificates)

To confirm a SQL Server connection uses TLS encryption, run this query from the SQL Server management console:

```sql
SELECT encrypt_option FROM sys.dm_exec_connections WHERE session_id = @@SPID;
```

A result of `TRUE` indicates the connection is encrypted.

### Agents Experience Slow Query Responses

Check the following:

- Add indexes to frequently queried columns
- Optimize any database views you use for access control
- Review database logs for inefficient queries the agents generate

## What Next?

After you create a SQL connector, assign it to an agent so the agent can query the database during conversations. For more information, see [Configuring Connectors](../index.md).

To configure this connector from the command line instead of the Agent Mesh UI, see [SQL Connectors via the CLI](./cli.md).
