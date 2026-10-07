# [Hands-on] Connectors

Add three connectors to the pre-deployed workshop services on AWS:

| Connector | Type | Connects to | Used by |
|---|---|---|---|
| `flights-db` | PostgreSQL | Travel database: airports, airlines, routes, and flight schedules | FlightSearchAgent |
| `hotels-db` | PostgreSQL | Travel database: hotels, rooms, and nightly rates | HotelSearchAgent |
| `places-mcp` | Remote MCP | Places MCP server: `find_restaurants` and `find_attractions` | LocalExperiencesAgent |

Choose one option:

- [Option 1: Apply with the `sam` CLI (recommended)](#option-1-apply-with-the-sam-cli-recommended)
- [Option 2: Create through the web UI](#option-2-create-through-the-web-ui)

---

## Option 1: Apply with the `sam` CLI (recommended)

### Step 1: Review the connectors

The connectors are in [sample_configuration/connectors](../sample_configuration/connectors/):

<details>
<summary><strong>flights-db.yaml</strong></summary>

```yaml
kind: connector
name: flights-db
description: "World flight schedules, routes, and pricing. Queried by FlightSearchAgent through the flight_offers view."
spec:
  type: sql
  subtype: postgres
  values:
    database: travel
    hostname: ec2-3-15-151-170.us-east-2.compute.amazonaws.com
    port: 5432
    username: travel
    password: ${TRAVEL_DB_PASSWORD}
```

</details>

<details>
<summary><strong>hotels-db.yaml</strong></summary>

```yaml
kind: connector
name: hotels-db
description: "World hotel listings, room types, and nightly rates. Queried by HotelSearchAgent through the hotel_offers view."
spec:
  type: sql
  subtype: postgres
  values:
    database: travel
    hostname: ec2-3-15-151-170.us-east-2.compute.amazonaws.com
    port: 5432
    username: travel
    password: ${TRAVEL_DB_PASSWORD}
```

</details>

<details>
<summary><strong>places-mcp.yaml</strong></summary>

```yaml
kind: connector
name: places-mcp
description: "Foursquare local places search. Provides the find_restaurants and find_attractions tools for LocalExperiencesAgent."
spec:
  type: mcp
  subtype: remote
  values:
    server_url: "http://ec2-3-138-119-114.us-east-2.compute.amazonaws.com:3001/mcp"
    connection_type: "sse"
    auth_type: "none"
```

</details>

### Step 2: Review the manifest

Open [sample_configuration/manifests/08-connectors.yaml](../sample_configuration/manifests/08-connectors.yaml). It adds the three connectors to the toolset from the previous step:

```yaml
kind: manifest
name: 08-connectors
description: Adds the flights, hotels, and places connectors
target:
  url: http://localhost:8800
resources:
  toolsets:
    - travel-planner
  connectors:
    - flights-db
    - hotels-db
    - places-mcp
```

### Step 3: Set the database password

```bash
export TRAVEL_DB_PASSWORD=travel123
```

### Step 4: Plan and apply

From the root of the repository, run:

```bash
sam config plan --manifest sample_configuration/manifests/08-connectors.yaml
```

The plan shows the three connectors as resources to create. `travel-planner` is unchanged.

```bash
sam config apply --manifest sample_configuration/manifests/08-connectors.yaml
```

> [!NOTE]
> On SAM Desktop, add `--target desktop` to both commands.

Continue to [Verify the connectors](#verify-the-connectors).

---

## Option 2: Create through the web UI

### Step 1: Flights database

1. Go to **Builder → Connectors → Create Connector → Apps → PostgreSQL**
1. Fill in the form:

    | Field | Value |
    |---|---|
    | Connector Name | `flights-db` |
    | Description | `World flight schedules, routes, and pricing. Queried by FlightSearchAgent through the flight_offers view.` |
    | Database Name | `travel` |
    | Database Hostname | `ec2-3-15-151-170.us-east-2.compute.amazonaws.com` |
    | Port | `5432` |
    | Username | `travel` |
    | Password | `travel123` |

1. Click **Create**

### Step 2: Hotels database

1. Go to **Builder → Connectors → Create Connector → Apps → PostgreSQL**
1. Fill in the form:

    | Field | Value |
    |---|---|
    | Connector Name | `hotels-db` |
    | Description | `World hotel listings, room types, and nightly rates. Queried by HotelSearchAgent through the hotel_offers view.` |
    | Database Name | `travel` |
    | Database Hostname | `ec2-3-15-151-170.us-east-2.compute.amazonaws.com` |
    | Port | `5432` |
    | Username | `travel` |
    | Password | `travel123` |

1. Click **Create**

### Step 3: Places MCP server

1. Go to **Builder → Connectors → Create Connector → Custom → Remote MCP**
1. Fill in the form:

    | Field | Value |
    |---|---|
    | Connector Name | `places-mcp` |
    | Description | `Foursquare local places search. Provides the find_restaurants and find_attractions tools for LocalExperiencesAgent.` |
    | Server URL | `http://ec2-3-138-119-114.us-east-2.compute.amazonaws.com:3001/mcp` |
    | Connection Type | `Server-Sent Events (SSE)` |
    | Auth Type | `No Authentication` |

1. Click **Next: Select Tools** and review the tools loaded from the server
1. Click **Next: Review Summary** and confirm `find_restaurants` and `find_attractions` are listed
1. Click **Create**

---

## Verify the connectors

1. Go to **Builder → Connectors**
1. Confirm `flights-db`, `hotels-db`, and `places-mcp` are listed

> [!TIP]
> If a connector cannot reach its service, check that the service is reachable from your environment:
>
> ```bash
> curl -s http://ec2-3-138-119-114.us-east-2.compute.amazonaws.com:3001/health
> # Expected: {"status":"healthy", ...}
> ```
>
> On SAM Desktop, re-run the IP registration from [Launch Solace Agent Mesh](./02_Handson_launch_agent_mesh.md#step-2-register-your-ip-address).

---
Section complete! Close this file and return to the Workshop Tracker to continue.
