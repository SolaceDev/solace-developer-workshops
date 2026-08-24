# Giving Agents System Access: Connectors

An agent that cannot reach a system cannot answer anything. Before Meridian's exception desk can triage a single order, it needs two things it does not have: the live inventory position, and the product catalog.

Those are two different systems, owned by two different teams. That is the whole reason there are two connectors here and not one.

---

## Table of Contents

- [What is a connector](#what-is-a-connector)
- [Hands-on: the operations database](#hands-on-the-operations-database)
- [Hands-on: the product catalog](#hands-on-the-product-catalog)
- [What happened?](#what-happened)

---

## What is a connector

A connector is a named, credentialed binding between an agent and an external system. You define it once with the connection details, then assign it to any number of agents by name. At runtime the connector exposes itself to the agent as a tool: the agent's model calls it with arguments derived from natural language, and the connector handles the network interaction.

The pattern is the same in every case. One definition, assigned by name, no custom code.

<div align="center">
     <img src="./img/conntectors.png" alt="Connector types" width="90%" style="box-shadow: 0 4px 8px rgb(0,200,130); border-radius: 8px;">
</div>

Solace Agent Mesh ships several types:

- **SQL**: query access to PostgreSQL, MySQL, MariaDB, SQL Server, and Oracle
- **MCP**: any Model Context Protocol server, over streamable HTTP or SSE, with its tools surfaced natively to the agent
- **OpenAPI**: a REST API described by a spec, with each operation becoming a callable tool
- **Knowledge base**: a managed vector store for retrieval-augmented answers
- **Event mesh**: publishing onto Solace topics from inside an agent

Meridian needs the first two.

---

## Hands-on: the operations database

The operational truth. What was ordered, what is in stock, where it is, and who the customer is.

1. Open [`sample_configuration/connectors/retail-postgres.yaml`](../sample_configuration/connectors/retail-postgres.yaml) and read it.

    ```
    kind: connector
    name: retail-postgres
    description: Meridian Outfitters retail operations database. Orders, inventory positions, locations, and customers.
    spec:
      type: sql
      subtype: postgres
      values:
        database: retail
        hostname: localhost
        port: 5432
        username: postgres
        password: ${RETAIL_DB_PASSWORD}
    ```

    > Note: The password is a `${VAR}` placeholder, not a literal. Secrets are resolved from the environment when you apply, so they never end up in version control.

1. Open [`sample_configuration/manifests/local.yaml`](../sample_configuration/manifests/local.yaml). Every list is empty. You fill them in as you work through the workshop.

1. Add the connector under `connectors`:

    ```
    resources:
      models: []
      connectors:
        - retail-postgres
      toolsets: []
      skills: []
      agents: []
      workflows: []
      entrypoints: []
    ```

1. Open a terminal and run a plan. This shows you what would change without changing anything.

    ```
    export RETAIL_DB_PASSWORD=postgres
    sam config plan --manifest sample_configuration/manifests/local.yaml
    ```

    > Note: Observe the following in the commandline

    ```
        connectors/
    + retail-postgres      create
    ```

1. Apply it.

    ```
    sam config apply --manifest sample_configuration/manifests/local.yaml
    ```

1. In the Solace Agent Mesh client, open the **Connectors** tab and confirm `retail-postgres` is there.

    <div align="center">
        <img src="./img/sam_connectors.png" alt="Connectors tab" width="90%" style="box-shadow: 0 4px 8px rgb(0,200,130); border-radius: 8px;">
    </div>

---

## Hands-on: the product catalog

The operations database knows what is in stock. It does not know which jackets merchandising considers interchangeable, which colorways are approved substitutes, or what the product copy says. That lives in the PIM, which is a separate service owned by a different team.

At Meridian that service speaks MCP. In your own organization it might be anything. The point of this half is that the connector kind changes and nothing else does.

1. Confirm the catalog service is running:

    ```
    curl -s localhost:9100/health
    ```

1. Create a new file, `sample_configuration/connectors/product-catalog.yaml`:

    ```
    kind: connector
    name: product-catalog
    description: Meridian Outfitters merchandising PIM. Style families, merch-approved substitution rules, and product copy.
    spec:
      type: mcp
      subtype: remote
      values:
        server_url: "http://localhost:9100/mcp"
        connection_type: "streamable-http"
        auth_type: "none"
        auth_apikey_location: "header"
        auth_apikey_name: "x-api-key"
        auth_http_scheme: "bearer"
        auth_oauth_mode: "discovery"
        auth_http_basic_username: "unused"
    ```

    > Note: The schema requires the auth fields even when `auth_type` is `none`. They are placeholders and are never read. A real MCP server behind OAuth or an API key would fill them in.

1. Add it to the manifest under `connectors`, below `retail-postgres`:

    ```
      connectors:
        - retail-postgres
        - product-catalog
    ```

1. Plan and apply:

    ```
    sam config plan --manifest sample_configuration/manifests/local.yaml
    sam config apply --manifest sample_configuration/manifests/local.yaml
    ```

    > Note: The plan shows one create and one unchanged. Solace Agent Mesh reconciles to the state you declared, so re-applying something that already matches does nothing.

1. Open the **Connectors** tab again. The MCP connector lists the three tools it discovered from the catalog server: `search_products`, `get_product`, and `get_substitution_rules`.

---

And that's it! What happened?

You declared two connectors and applied them to the running platform:

1. **A SQL connector** (`retail-postgres`) pointing at Meridian's operations database. It holds the connection details and exposes SQL execution as a tool. An agent asking "how much of this SKU is left in the west region" gets a real answer from real rows.

2. **An MCP connector** (`product-catalog`) pointing at the merchandising catalog service. It fetched the server's tool list at apply time and surfaced those tools to the mesh natively.

The important thing is what did **not** differ between them. Same `kind`, same manifest, same plan-and-apply cycle, no code either time. The agent you build in the next section will not know or care which kind of system it is talking to; it sees tools. That is what makes "bring your own data source" a configuration exercise rather than a project.

Keeping them separate matters too. If the catalog were just another table in the operations database, the fact that merchandising owns those rules and versions them on their own schedule would disappear into the schema. Two systems, two owners, two connectors.

---
Section complete! Close this file and return to the Workshop Tracker to continue.
