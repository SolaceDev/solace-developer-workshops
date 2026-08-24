"""Meridian Outfitters product catalog: a small MCP server standing in for a PIM.

Why this is a separate service rather than three more tables behind the SQL
connector: in a real retailer the product information manager is owned by
merchandising, versioned on their schedule, and reached over a network. Style
families and approved substitutions are merchandising constructs, not inventory
facts. Collapsing them into the operations database would make the workshop
simpler and the architecture a lie.

It reads the catalog-owned tables (style_families, substitution_rules,
product_copy) plus the product master. The SQL connector must never reach the
first three.

The shapes returned here are the input contract for the score_substitutes tool
in sample_configuration/toolsets/substitution-scoring/. Field names match its
Product, Availability, and Rules structs exactly, so the agent passes results
through without reshaping them. A mismatch here surfaces as an agent silently
dropping candidates, which is close to undebuggable in a live room. Change one
side and you must change the other.
"""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row

from mcp.server.fastmcp import FastMCP

DB = {
    "host": os.environ.get("RETAIL_DB_HOST", "localhost"),
    "port": int(os.environ.get("RETAIL_DB_PORT", "5432")),
    "dbname": os.environ.get("RETAIL_DB_NAME", "retail"),
    "user": os.environ.get("RETAIL_DB_USER", "postgres"),
    "password": os.environ.get("RETAIL_DB_PASSWORD", "postgres"),
}

PORT = int(os.environ.get("CATALOG_PORT", "9100"))

mcp = FastMCP("product-catalog", host="0.0.0.0", port=PORT)


@contextmanager
def cursor():
    """One short-lived connection per call.

    The workshop's query volume is trivial and a pool would only add a way for
    this to break during a lab.
    """
    with psycopg.connect(**DB, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            yield cur


def _decimals_to_float(row: dict[str, Any]) -> dict[str, Any]:
    """psycopg returns numeric as Decimal, which is not JSON-serialisable.

    The scoring tool expects list_price and unit_cost as numbers.
    """
    return {
        k: (float(v) if hasattr(v, "as_tuple") else v)
        for k, v in row.items()
    }


@mcp.tool()
def search_products(
    style_id: str | None = None,
    category: str | None = None,
    season: str | None = None,
    exclude_sku: str | None = None,
    near_size_ordinal: int | None = None,
    same_style_only: bool = False,
) -> str:
    """Find candidate products in the same merchandising family.

    Returns the colorways and sizes that could plausibly substitute, with the
    attributes needed to score them. Pass style_id and near_size_ordinal
    together: the family narrows the search to genuinely interchangeable
    products, and the size window drops the ones the merch size rule would
    reject anyway.

    Args:
        style_id: Style to find candidates for, for example CS.
        category: One of jackets, packs, footwear.
        season: FW25 or SS26.
        exclude_sku: A SKU to leave out, normally the one that failed.
        near_size_ordinal: Keep sizes near this one, 1 (XS) to 5 (XL). Supply
            the failed line's size ordinal.
        same_style_only: Keep only the failed style's own colorways. Start here
            for a like-for-like swap; drop it to widen to the whole family when
            nothing in the style works.
    """
    where, params = [], []
    if style_id and same_style_only:
        # Like-for-like: a different colorway or size of the same garment.
        where.append("p.style_id = %s")
        params.append(style_id)
    elif style_id:
        # Family membership is a merchandising construct, so resolve through
        # style_families rather than matching on style_id directly. Two styles
        # can be substitutes for each other without sharing a style_id.
        where.append("""p.style_id IN (
            SELECT sf2.style_id FROM style_families sf1
            JOIN style_families sf2 ON sf2.family_id = sf1.family_id
            WHERE sf1.style_id = %s)""")
        params.append(style_id)
    if category:
        where.append("p.category = %s")
        params.append(category)
    if season:
        where.append("p.season = %s")
        params.append(season)
    if exclude_sku:
        where.append("p.sku <> %s")
        params.append(exclude_sku)
    if near_size_ordinal is not None:
        # Widened by one beyond the usual max_size_delta so the caller can see
        # what sits just outside the rule, rather than the catalog silently
        # deciding. The scoring tool is what rejects it, and it says why.
        where.append("ABS(p.size_ordinal - %s) <= 2")
        params.append(near_size_ordinal)

    if not where:
        return json.dumps({
            "error": "Supply at least one of style_id, category, or season. "
                     "An unfiltered catalog scan is not useful for substitution."
        })

    sql = f"""
        SELECT p.sku, p.style_id, p.name, p.category, p.color, p.color_family,
               p.size, p.size_ordinal, p.list_price, p.unit_cost, p.season,
               sf.family_id, sf.family_name
        FROM products p
        JOIN style_families sf ON sf.style_id = p.style_id
        WHERE {' AND '.join(where)}
        ORDER BY p.sku
    """

    with cursor() as cur:
        cur.execute(sql, params)
        rows = [_decimals_to_float(r) for r in cur.fetchall()]

    return json.dumps({"count": len(rows), "products": rows}, indent=2)


@mcp.tool()
def get_product(sku: str) -> str:
    """Get one product's full attributes plus its marketing copy.

    The copy lives in the catalog, not the operations database, and is what a
    customer-facing message should quote when describing a substitute.

    Args:
        sku: The SKU to look up, for example CS-SLT-M.
    """
    with cursor() as cur:
        cur.execute(
            """
            SELECT p.sku, p.style_id, p.name, p.category, p.color,
                   p.color_family, p.size, p.size_ordinal, p.list_price,
                   p.unit_cost, p.season, sf.family_id, sf.family_name,
                   pc.marketing_copy
            FROM products p
            JOIN style_families sf ON sf.style_id = p.style_id
            LEFT JOIN product_copy pc ON pc.sku = p.sku
            WHERE p.sku = %s
            """,
            [sku],
        )
        row = cur.fetchone()

    if row is None:
        return json.dumps({"error": f"No product with SKU {sku}."})
    return json.dumps(_decimals_to_float(row), indent=2)


@mcp.tool()
def get_substitution_rules(style_id: str) -> str:
    """Get the merchandising constraints on substituting for a style.

    These are constraints, not preferences. A candidate in a forbidden color
    family or beyond the size delta is excluded outright, never ranked with a
    low score. Pass the result straight to score_substitutes as its `rules`
    argument.

    Args:
        style_id: The style whose rules you need, for example CS.
    """
    with cursor() as cur:
        cur.execute(
            """
            SELECT style_id, forbidden_color_families, max_size_delta, notes
            FROM substitution_rules
            WHERE style_id = %s
            """,
            [style_id],
        )
        row = cur.fetchone()

    if row is None:
        # A style with no rule row is unconstrained apart from the house
        # default. Return that explicitly rather than nothing, so the caller
        # never has to decide what a missing rule means.
        return json.dumps({
            "style_id": style_id,
            "forbidden_color_families": [],
            "max_size_delta": 1,
            "notes": "No specific rule on file. House default applies.",
        }, indent=2)

    return json.dumps(dict(row), indent=2)


@mcp.custom_route("/health", methods=["GET"])
async def health(_request):
    """Readiness probe.

    Reports unhealthy until the database is actually queryable, because a
    catalog that is listening but cannot reach postgres is not ready and the
    container bring-up should wait rather than proceed.
    """
    from starlette.responses import JSONResponse

    try:
        with cursor() as cur:
            cur.execute("SELECT count(*) AS n FROM style_families")
            families = cur.fetchone()["n"]
    except Exception as exc:
        return JSONResponse(
            {"status": "unhealthy", "database": "unreachable", "detail": str(exc)},
            status_code=503,
        )

    if families == 0:
        return JSONResponse(
            {"status": "unhealthy", "database": "reachable", "detail": "catalog tables are empty; run util/seed_retail_db.sh"},
            status_code=503,
        )

    return JSONResponse({"status": "healthy", "style_families": families})


if __name__ == "__main__":
    # Streamable HTTP, which is what the product-catalog connector expects at
    # http://localhost:9100/mcp.
    mcp.run(transport="streamable-http")
