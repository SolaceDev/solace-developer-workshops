---
title: SQL Connectors
description: Configure SQL connectors so agents can query MySQL, PostgreSQL, MariaDB, Microsoft SQL Server, or Oracle databases through natural language.
sidebar_position: 2
---

# SQL Connectors

SQL connectors allow agents to query and analyze database information using natural language.

## Overview

SQL connectors convert user questions into SQL queries, execute them against your database, and return results in conversational format. This allows users to access database information through agent conversations without writing SQL code.

The connector opens a database connection for each query and closes it when the query completes. The connector handles the specifics of each database type automatically, including the appropriate SQL dialect, connection protocol, and driver.

## Supported Databases

Agent Mesh supports the following database types for SQL connectors:

- MySQL
- PostgreSQL
- MariaDB
- Microsoft SQL Server (MSSQL)
- Oracle

Each database type uses the same configuration interface but requires connection parameters appropriate for that database system.

## Prerequisites

Before you create a SQL connector, ensure you have the following:

- A running database server reachable from Agent Mesh
- A database username and password with the permissions agents need
- Network connectivity from Agent Mesh to the database server on the appropriate port
- The name of the database that agents will query

The following sections describe each prerequisite in detail.

### Database Server Access

You need a running database server that Agent Mesh can reach over the network. The database server must be configured to accept connections from the Agent Mesh deployment's network or IP address range.

### Database Credentials

You need a database username and password. Grant the user only the permissions agents need—for example, `SELECT` on specific tables for a read-only assistant. For example grants, see `link to "Database Permission Configuration"` .

### Network Connectivity

Verify that network firewalls and security groups allow traffic from Agent Mesh to your database server on the appropriate port. Default ports are:

- MySQL: `3306`
- MariaDB: `3306`
- PostgreSQL: `5432`
- MSSQL: `1433`
- Oracle: `1521`

### Database Name

You need the name of the database that agents query. Agents always use the database's default schema (`public` for PostgreSQL, `dbo` for SQL Server).

## Creating a SQL Connector

Create the connector through the Connectors section in the Agent Mesh web interface (see `link to "Connectors"`  for the general flow), then fill in the following fields.

### Connector Configuration

| Field             | Required | Description                                                                                                                                                                                                                       |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database Type     | Yes      | One of MySQL, PostgreSQL, MariaDB, Microsoft SQL Server, or Oracle. Determines the driver and connection string format                                                                                                            |
| Database Host     | Yes      | Hostname or IPv4 address of the database server (for example, `db.example.com`, `192.168.1.100`, or an internal hostname like `db.internal.example.com`). IPv6 literals are not accepted by the form     |
| Port              | Yes      | TCP port where the database accepts connections. Defaults: MySQL/MariaDB `3306`, PostgreSQL `5432`, MSSQL `1433`, Oracle `1521`                                                                                                   |
| Database Name     | Yes      | Database within the server that agents query. Allowed characters: letters, digits, `_`, and `$`. Agents query the database's default schema (`public` for PostgreSQL, `dbo` for SQL Server)                                       |
| Username          | Yes      | Database username for authentication. The user's permissions determine which tables and operations agents can access                                                                                                              |
| Password          | Yes      | Password for the database username                                                                                                                                                                                                |

#### MSSQL-Specific Fields

| Field                    | Required | Description                                                                                                                                                                                       |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encryption (TLS)         | Yes      | `Enabled` (default), `Disabled`, or `Strict`. `Strict` enforces TLS and always validates the server certificate, ignoring the Trust Server Certificate field                                      |
| Trust Server Certificate | No       | Visible only when Encryption is `Enabled`. `Disabled` (default) validates the certificate; `Enabled` skips validation. Use `Enabled` only for development or self-signed certificates             |

#### Oracle-Specific Fields

| Field        | Required | Description                                                                                                                                                       |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service Name | Yes      | Replaces Database Name for Oracle. Identifies the target database on the Oracle listener. Allowed characters: letters, digits, `_`, `$`, and `.`                  |

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

## After You Create the Connector

The connector is now available for you to assign to agents. For information about assigning, editing, and deleting connectors, see `link to "Connectors"` .

## Security Considerations

SQL connectors use a shared credential model. For more information, see `link to "Connectors"` .

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

When connecting to PostgreSQL databases hosted on Supabase, you may encounter network errors:

```json
{ "detail": "Invalid token", "error_type": "invalid_token" }
```

This occurs because the Supabase direct connection endpoint uses IPv6 addressing, but most Agent Mesh deployments default to IPv4 networking. Use the Session Pooler endpoint instead because it is IPv4 compatible.

In your Supabase project settings, navigate to Database then Connection Pooling to find the Session Pooler connection string. Use the host and port from this connection string when configuring your SQL connector. The database name, username, and password remain the same as your direct connection credentials.

### Microsoft SQL Server Certificate Validation Fails

When connecting to SQL Server with `Trust Server Certificate` set to **Disabled**, you may see certificate validation errors:

```text
SSL Provider: certificate verify failed: unable to get local issuer certificate
```

The Agent Mesh container does not trust the SQL Server certificate. To resolve this, use one of the following options:

- **Enable Trust Server Certificate**—set `Trust Server Certificate` to **Enabled** in the connector configuration. This bypasses certificate validation, which is appropriate for self-signed certificates in development environments
- **Install the CA certificate**—install the CA certificate that signed the SQL Server certificate into the Agent Mesh container's trust store. For instructions, see `link to "Add CA certificates to a container"` 

To confirm a SQL Server connection uses TLS encryption, run this query from the SQL Server management console:

```sql
SELECT encrypt_option FROM sys.dm_exec_connections WHERE session_id = @@SPID;
```

A result of `TRUE` indicates the connection is encrypted.

### Agents Experience Slow Query Responses

Check the following:

- Frequently queried columns have appropriate indexes
- Database views are optimized if you use them for access control
- Query patterns in database logs do not show inefficient queries that agents generate

## What Next?

You have just created a SQL connector. Most readers next want to assign the connector to an agent, covered in `link to "Connectors"` .
