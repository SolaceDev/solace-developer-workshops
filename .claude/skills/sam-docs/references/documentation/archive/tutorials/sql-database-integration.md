---
title: SQL Database Integration
description: Build an agent that answers natural-language questions about data in a SQL database, with schema introspection and a production hardening path.
sidebar_position: 4
---

# SQL Database Integration

This tutorial attaches a SQL database to a Solace Agent Mesh agent so the agent can answer questions like *"how many customers signed up last quarter?"* by generating and executing real SQL. The runtime ships a tool — `execute_sql_query` — that connects to Postgres, MySQL, SQLite, MS SQL Server, or Oracle and introspects the schema on startup, putting the table layout in the LLM's context so the first query is correct.

The primary walkthrough uses **SQLite** so you can run it without Docker. A short follow-on section covers the production hardening you want before pointing the same agent at a Postgres deployment.

By the end you will have:

- A SQLite database seeded with a small company schema.
- A configured agent with the `execute_sql_query` tool wired to that database.
- A working bot you can ask aggregate, filter, and join questions in plain English.
- A read-only Postgres role and the YAML changes needed to point the agent at it instead.

## What You Need Before You Start

- Agent Mesh installed locally. Walk Installing → Install first if you have not.
- An LLM API endpoint and key for the agent's model — Installing → Configure covers the env-var contract. The LLM needs to be capable enough to write SQL; `gpt-4o`, `claude-sonnet-4-5`, or similar are good defaults.
- A broker the agent can reach. The dev broker the `sam` CLI starts is fine for a laptop run.
- The SQL tool binary at `~/.config/sam/tools/sql/sql`, where the Secure Tool Runtime expects it. The Agent Mesh installer drops it here automatically — verify it exists before continuing, since a missing binary causes the tool to fail to register at agent startup.
- `sqlite3` on the command line for the seed step. macOS and most Linux distributions ship it; otherwise install it from your package manager.

## Seed a SQLite Database

Drop the seed schema into a new SQLite file. The seed schema is small enough to fit on a page but rich enough that the agent has aggregates, joins, and filters to exercise.

```sql
-- /tmp/company-seed.sql
CREATE TABLE customers (
  customer_id  INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  region       TEXT NOT NULL,
  signup_date  TEXT NOT NULL
);

CREATE TABLE products (
  product_id   INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  unit_price   REAL NOT NULL
);

CREATE TABLE orders (
  order_id     INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(customer_id),
  product_id   INTEGER NOT NULL REFERENCES products(product_id),
  quantity     INTEGER NOT NULL,
  order_date   TEXT NOT NULL,
  total        REAL NOT NULL
);

INSERT INTO customers (customer_id, name, region, signup_date) VALUES
  (1, 'Acme Industrial',  'NA-EAST', '2026-01-12'),
  (2, 'Beacon Logistics', 'NA-WEST', '2026-02-18'),
  (3, 'Coral Foods',      'EMEA',    '2026-03-04'),
  (4, 'Delta Materials',  'NA-EAST', '2026-04-22'),
  (5, 'Everest Robotics', 'APAC',    '2026-05-09');

INSERT INTO products (product_id, name, category, unit_price) VALUES
  (101, 'Hot-Rolled Steel',  'metal',     1.00),
  (102, 'Cold-Rolled Steel', 'metal',     1.25),
  (103, 'Aluminum Sheet',    'metal',     2.50),
  (104, 'Industrial Adhesive','chemical', 18.00);

INSERT INTO orders (order_id, customer_id, product_id, quantity, order_date, total) VALUES
  (5001, 1, 101, 12000, '2026-02-01',  12000.00),
  (5002, 2, 103,   400, '2026-03-15',   1000.00),
  (5003, 1, 102,  8500, '2026-04-02',  10625.00),
  (5004, 3, 104,    50, '2026-04-18',    900.00),
  (5005, 4, 101,  3000, '2026-05-05',   3000.00),
  (5006, 5, 103,   180, '2026-05-12',    450.00);
```

Load it:

```bash
sqlite3 /tmp/sam-company.db < /tmp/company-seed.sql
```

Confirm the load:

```bash
sqlite3 /tmp/sam-company.db "SELECT COUNT(*) FROM orders"
```

The output is `6`.

## Configure the Agent

Drop an agent config that attaches the SQL tool. The `execute_sql_query` tool is a remote tool — it runs inside the Secure Tool Runtime, not inside the agent process, which is why the binary at `~/.config/sam/tools/sql/sql` has to exist.

```yaml
# configs/company_agent.yaml
log:
  level: info

apps:
  - name: company_agent_app
    app_exec: sam-awe
    app_config:
      agent_name: CompanyAgent
      display_name: Company
      namespace: ${NAMESPACE, solace-agent-mesh}
      supports_streaming: true

      model:
        model: ${LLM_SERVICE_GENERAL_MODEL_NAME, openai/gpt-4o}
        api_base: ${LLM_SERVICE_ENDPOINT}
        api_key: ${LLM_SERVICE_API_KEY}
        parallel_tool_calls: false
        temperature: 0.1

      instruction: |
        You are a business analytics assistant. You answer questions about
        the company's customers, products, and orders by issuing SQL
        queries against the `query_company_db` tool. Always write one
        SQL query that returns the answer directly — push every
        aggregation (sum, count, average, group by) into SQL rather than
        computing it yourself. When a question is ambiguous, ask one
        clarifying question before running a query.

      tools:
        - tool_type: builtin
          tool_name: query_company_db
          tool_config:
            _str_binary: execute_sql_query
            tool_name: query_company_db
            tool_description: |
              Query the company database. Available tables: customers,
              products, orders. Use this to answer any question about
              customers, what they bought, and when.
            connection_string: "sqlite:////tmp/sam-company.db"
            auto_detect_schema: true

      session_service:
        type: memory
        default_behavior: "PERSISTENT"
      artifact_service:
        type: filesystem
        base_path: /tmp/sam
        artifact_scope: namespace
      enable_embed_resolution: true

      agent_card:
        description: |
          An analytics agent over the company database. Answers questions
          about customers, products, and orders by running SQL against
          a SQLite copy of the company data.
        defaultInputModes: ["text"]
        defaultOutputModes: ["text"]

      agent_card_publishing: { interval_seconds: 10 }
      agent_discovery: { enabled: true }
```

The keys inside `tool_config:` are the contract between the agent and the SQL tool. The most important ones:

- **`_str_binary: execute_sql_query`** — names the tool binary the Secure Tool Runtime spawns for this tool. The binary ships pre-installed at `~/.config/sam/tools/sql/sql`.
- **`tool_name`** — the name the LLM sees and calls. Pick something descriptive — the LLM uses this string as the primary cue for when to invoke the tool. `query_company_db` is better than `sql`.
- **`tool_description`** — the prose the LLM reads when deciding whether to call the tool. List the tables and what the database is for. With `auto_detect_schema: true` the runtime appends the full schema (columns, types, sample values) to this description at startup, so the LLM sees the structure too.
- **`connection_string`** — the database URL. For SQLite, the form is `sqlite:////absolute/path/to/file.db` (note the four slashes — three for the URL scheme, one for the absolute path). For other backends see the Switching the database section.
- **`auto_detect_schema: true`** — the value-add of this tool. On startup the runtime opens the database, samples every table, and embeds the resulting schema YAML in the tool description the LLM reads. With this off, the LLM has to guess at column names.

Two optional knobs you may want to tune:

- **`max_enum_cardinality: 100`** (default) — columns with at most this many distinct values are surfaced as enums in the schema description. Raise it if you have a column like `region` with 200 distinct values you still want the LLM to enumerate.
- **`schema_sample_size: 100`** (default) — the number of rows the runtime samples per table during introspection. Raise it for very wide schemas where the first 100 rows underrepresent the value distribution.

## Run the Agent

Set the environment, then start everything in one command.

```bash
export NAMESPACE=solace-agent-mesh
export LLM_SERVICE_ENDPOINT=${LLM_SERVICE_ENDPOINT}
export LLM_SERVICE_API_KEY=${LLM_SERVICE_API_KEY}
export LLM_SERVICE_GENERAL_MODEL_NAME=openai/gpt-4o
export SOLACE_DEV_MODE=true
```

Launch the agent and a Web UI gateway under one orchestrator (any HTTP-driving client works — the REST gateway integration tutorial covers the end-to-end `curl` recipe):

```bash
sam run configs/
```

`sam run` spawns one subprocess per YAML config in the directory (the agent and the gateway) and starts an in-process TCP dev broker on `:55554` that both subprocesses connect to. Logs from each subprocess are interleaved into the same terminal with `[company_agent]` / `[webui_gateway]` prefixes, and `Ctrl+C` shuts down everything together.

In the agent logs, look for the line `registered builtin tool (remote/STR)` with `tool=query_company_db`. That confirms the tool spawned the SQL binary, opened the database, and pulled the schema. Without that line, the tool is not registered and queries to the agent will fail with `tool not found`.

In the same logs (at `DEBUG` level), look for `database connected` and the schema introspection output — a block of YAML listing each table, its columns, and the inferred type and value-range. That is the text the LLM sees when it picks the tool.

## Ask the Agent Questions

Three sample questions exercise different shapes of query the agent has to produce. Submit them through `curl` against the Web UI gateway as the REST tutorial walks, or through any other gateway you have running.

### Simple Count

> *How many customers do we have?*

The agent picks `query_company_db`, writes `SELECT COUNT(*) FROM customers`, and returns `5`.

### Aggregate

> *What is the total revenue across all orders?*

The agent writes `SELECT SUM(total) FROM orders` and returns `27975.00`. The `total` column happens to be pre-computed in the seed data; if the question were *"what is the total revenue assuming current unit prices?"*, the agent would write a `JOIN` with `products` and multiply `quantity * unit_price`.

### Ambiguous

> *Show me last month's revenue.*

A capable LLM will ask for clarification — *"by last month, do you mean April 2026 or the trailing 30 days?"* — and then write the appropriate `WHERE order_date BETWEEN ... AND ...` filter once you answer. This is the agent's reasoning surfacing the ambiguity. If the LLM does not clarify and just picks one interpretation, that is a property of the model you are using, not of the tool.

In every case, the agent's reply includes the SQL it ran. That transparency is part of why the `execute_sql_query` tool is the right shape for an analytics agent — the human can read the query and confirm it matches their intent.

## Switching the Database

The `connection_string` URL scheme decides the dialect. Five drivers ship with the tool:

| Backend       | URL form                                                       |
|---------------|----------------------------------------------------------------|
| SQLite (file) | `sqlite:////absolute/path/to/file.db`                          |
| SQLite (memory)| `sqlite:///:memory:`                                          |
| PostgreSQL    | `postgres://user:password@host:5432/dbname?sslmode=disable`    |
| MySQL         | `mysql://user:password@host:3306/dbname`                       |
| MS SQL Server | `sqlserver://user:password@host:1433?database=dbname`          |
| Oracle        | `oracle://user:password@host:1521/service_name`                |

Swap the `connection_string` for any of these and restart the agent. The schema-introspection step runs against whichever backend you point at, so the LLM sees the same shape of context regardless of dialect.

## Moving to Postgres for Production

SQLite is a fine prototyping surface; production deployments point at a real database. The minimum hardening to do before the agent reaches a production database:

### 1. Provision a Read-Only Database Role

Inside the database, create a dedicated role for the agent and grant it only what it needs. Postgres example:

```sql
CREATE ROLE agent_readonly LOGIN PASSWORD :'AGENT_PASSWORD';

GRANT CONNECT ON DATABASE company_db TO agent_readonly;
GRANT USAGE ON SCHEMA public TO agent_readonly;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM agent_readonly;
GRANT SELECT ON customers, products, orders TO agent_readonly;
```

The `REVOKE ALL` runs before the explicit `GRANT SELECT` so a fresh role starts from zero privileges and picks up only the table list you name. The order matters — if a future schema migration adds tables, the agent does not see them until you add them to the GRANT.

The agent's connection string then uses the read-only role:

```yaml
connection_string: "postgres://agent_readonly:${AGENT_DB_PASSWORD}@db.prod.example.com:5432/company_db?sslmode=verify-full"
```

`sslmode=verify-full` enforces TLS to the database and validates the certificate chain. Anything less is acceptable only on a private network you trust end to end.

### 2. Cap Query Runtime in the Database

The tool itself does not bound query runtime — that is the database's job. Set `statement_timeout` on the agent's role so a runaway aggregation cannot pin a connection:

```sql
ALTER ROLE agent_readonly SET statement_timeout = '30s';
```

A 30-second cap is a sensible default for an interactive agent; raise it only if you have specific queries you know take longer.

### 3. Enable Query Logging for Audit

The database knows every query the agent ran. Turn on logging:

```text
# postgresql.conf
log_statement = 'all'
log_min_duration_statement = 100ms
```

Forward the resulting log to your audit pipeline; the agent's `traceID` is not in the database log, so correlate by timestamp and query text. Administering → Audit and compliance covers the broader audit-trail story.

### 4. Restart the Agent

The connection string is read once at agent startup. If you rotate the read-only role's password (or any other connection-string field), restart the agent process — the tool re-introspects the schema on connect.

## Attaching More Than One Database

An analytics agent often needs two databases — a transactional database for current state, an analytics warehouse for historical roll-ups. Expose each as its own tool:

```yaml
tools:
  - tool_type: builtin
    tool_name: query_orders_db
    tool_config:
      _str_binary: execute_sql_query
      tool_name: query_orders_db
      tool_description: "Live orders, customers, and products. Use for current state."
      connection_string: "postgres://agent_readonly:${ORDERS_DB_PASSWORD}@orders.prod.example.com/orders"
      auto_detect_schema: true

  - tool_type: builtin
    tool_name: query_analytics_warehouse
    tool_config:
      _str_binary: execute_sql_query
      tool_name: query_analytics_warehouse
      tool_description: "Historical roll-ups of orders, revenue, and churn."
      connection_string: "postgres://warehouse_readonly:${WAREHOUSE_PASSWORD}@warehouse.prod.example.com/analytics"
      auto_detect_schema: true
```

Each tool gets its own `tool_name` and its own description. The LLM picks between them based on which one the user's question maps to. With clear tool names and descriptions, the agent routes correctly without ever seeing both schemas mixed.

## Troubleshooting

### Tool Registration Fails: "Connection Refused" or "Could Not Connect"

**Symptoms.** The agent logs show `failed to register tool` or the tool description contains `WARNING: This database is currently UNAVAILABLE`.
**Diagnostic.** Check the `connection_string`. For SQLite, confirm the file exists and the agent process can read it (`ls -la /tmp/sam-company.db` from the user the agent runs as). For Postgres / MySQL / MS SQL / Oracle, try connecting from the same host with the database vendor's CLI using the same credentials — `psql`, `mysql`, `sqlcmd`, `sqlplus`.
**Resolution.** Fix the host, port, credentials, or `sslmode` in the connection string and restart the agent. The schema-introspection step runs at startup, so the tool description picks up the fix on restart.
**Prevention.** Use `${VAR}` placeholders for connection strings so the secret stays out of YAML. If a production database is behind a firewall, confirm the agent host is on the allow list before deploying.

### "Permission Denied" on `SELECT`

**Symptoms.** The agent runs a query and the response contains a database error like `permission denied for relation orders`.
**Diagnostic.** Check the role the connection string is using. Run `SELECT current_user` through the tool itself by asking the agent *"what database user are you connecting as?"* — the agent will issue a query and report the role.
**Resolution.** Grant the missing privileges to the read-only role: `GRANT SELECT ON <table> TO agent_readonly`. If new tables are added after the agent is deployed, re-run the GRANT — it does not propagate automatically.
**Prevention.** Use `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO agent_readonly` so newly-created tables in that schema pick up the grant automatically.

### Agent Ignores the Schema or Writes Queries Against the Wrong Columns

**Symptoms.** The agent makes up column names that do not exist, or queries the wrong table, or writes a query that returns no rows when you know the answer exists.
**Diagnostic.** Confirm `auto_detect_schema: true` is set on the `tool_config:` block. In the agent logs (at `DEBUG` level), look for the schema YAML the runtime extracted on connect. If the YAML is missing or empty, the schema introspection failed.
**Resolution.** If the schema is missing, the tool's description contains a connection-error message; fix the connection (previous entry). If the schema is present but the agent still ignores it, the tool description is too vague — sharpen the `tool_description` text to mention the tables by name and what they contain.
**Prevention.** Keep the `tool_description` short and concrete. The LLM reads it for every tool-call decision; describe the *domain* (`Query the company database`), not the *mechanism* (`Run SQL`).

## What Next?

You have now wired an agent to a SQL database. Most readers next want to attach external systems through the Model Context Protocol — covered in MCP integration. For the full set of tool kinds the runtime supports, see Building → Tools.
