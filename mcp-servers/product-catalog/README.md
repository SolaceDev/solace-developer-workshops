# Product catalog MCP server

Stands in for Meridian Outfitters' product information manager. The workshop's
`product-catalog` connector points at it.

## Why it is a separate service

In a real retailer the PIM is owned by merchandising, versioned on their
schedule, and reached over a network. Style families and approved substitutions
are merchandising constructs, not inventory facts.

Folding these three tables in behind the SQL connector would make the workshop
simpler and the architecture a lie. It would also remove the section where
attendees mentally substitute their own systems, which is the point of the MCP
half of guide 200.

## Tools

| Tool | Returns |
|---|---|
| `search_products` | Candidate SKUs, filtered by merch family and size window |
| `get_product` | One SKU's attributes plus its marketing copy |
| `get_substitution_rules` | Forbidden color families and the maximum size delta |

`search_products` defaults to the whole merchandising family. Pass
`same_style_only: true` for a like-for-like swap, which is what the workflow
does first: for the canonical order it narrows 54 family candidates to the 14
colorways and sizes of the failed style.

## The output contract

The shapes returned here are the input contract for `score_substitutes` in
`sample_configuration/toolsets/substitution-scoring/`. Field names match its
`Product`, `Availability`, and `Rules` structs exactly, so the agent passes
results through without reshaping them.

A mismatch surfaces as an agent silently dropping candidates, which is close to
undebuggable in a live room. Change one side and you must change the other.

Note the split: this server supplies **attributes and rules**, and the SQL
connector supplies **availability**. The agent joins them. That is deliberate,
and it mirrors how the two systems are actually owned.

## Running it

```
./start.sh
```

Idempotent, backgrounds itself, and waits up to 30 seconds for `/health`.

Configuration is by environment variable:

| Variable | Default |
|---|---|
| `RETAIL_DB_HOST` | `localhost` |
| `RETAIL_DB_PORT` | `5432` |
| `RETAIL_DB_NAME` | `retail` |
| `RETAIL_DB_USER` | `postgres` |
| `RETAIL_DB_PASSWORD` | `postgres` |
| `CATALOG_PORT` | `9100` |

## Health

```
curl -s localhost:9100/health
```

Returns 200 with the family count when the catalog is queryable, and 503 when
postgres is unreachable or the catalog tables are empty. The seed script and the
devcontainer both wait on this, so it deliberately reports unhealthy rather than
merely "listening": a catalog that cannot reach its database is not ready.
