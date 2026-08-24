-- Meridian Outfitters retail schema
--
-- Two logical owners share one postgres instance:
--   * Operational tables (products, inventory, locations, orders,
--     order_lines, customers) are read by the retail-postgres SQL connector.
--   * Catalog tables (style_families, substitution_rules, product_copy) are
--     read ONLY by the product-catalog MCP server. The SQL connector must not
--     reach them; the two-systems narrative depends on that separation.
--
-- Every column here is read by an agent prompt, the scoring tool, the MCP
-- server, or a guide exercise. Nothing is decorative.

BEGIN;

DROP TABLE IF EXISTS order_lines    CASCADE;
DROP TABLE IF EXISTS orders         CASCADE;
DROP TABLE IF EXISTS inventory      CASCADE;
DROP TABLE IF EXISTS product_copy   CASCADE;
DROP TABLE IF EXISTS substitution_rules CASCADE;
DROP TABLE IF EXISTS style_families CASCADE;
DROP TABLE IF EXISTS products       CASCADE;
DROP TABLE IF EXISTS locations      CASCADE;
DROP TABLE IF EXISTS customers      CASCADE;

-- ---------------------------------------------------------------------------
-- Operational tables
-- ---------------------------------------------------------------------------

CREATE TABLE locations (
    location_id text PRIMARY KEY,
    name        text    NOT NULL,
    type        text    NOT NULL CHECK (type IN ('dc', 'store')),
    region      text    NOT NULL CHECK (region IN ('us-west', 'us-east', 'us-central', 'us-south')),
    state       text    NOT NULL,
    -- Not every store fulfills ecom. Drives a hard fail in substitution scoring.
    ships_ecom  boolean NOT NULL
);

COMMENT ON TABLE locations IS 'Distribution centers and stores. region drives delivery distance and the event topic taxonomy.';

CREATE TABLE products (
    sku          text PRIMARY KEY,
    -- Groups colorways and sizes of the same garment, e.g. CS = Cascade Shell.
    style_id     text    NOT NULL,
    name         text    NOT NULL,
    category     text    NOT NULL CHECK (category IN ('jackets', 'packs', 'footwear')),
    color        text    NOT NULL,
    -- Merch grouping. A forbidden color_family is a hard fail, not a low score.
    color_family text    NOT NULL CHECK (color_family IN ('neutral', 'earth', 'bright')),
    size         text    NOT NULL,
    -- 1..5 for XS..XL. Makes size proximity arithmetic rather than judgement.
    size_ordinal int     NOT NULL CHECK (size_ordinal BETWEEN 1 AND 5),
    list_price   numeric(10,2) NOT NULL,
    unit_cost    numeric(10,2) NOT NULL,
    season       text    NOT NULL CHECK (season IN ('FW25', 'SS26'))
);

COMMENT ON TABLE products IS 'Product master. size_ordinal and color_family are the backbone of substitution scoring; unit_cost makes margin real.';

CREATE INDEX products_style_id_idx ON products (style_id);

CREATE TABLE inventory (
    sku         text NOT NULL REFERENCES products (sku),
    location_id text NOT NULL REFERENCES locations (location_id),
    on_hand     int  NOT NULL CHECK (on_hand >= 0),
    reserved    int  NOT NULL CHECK (reserved >= 0),
    -- Generated, so available can never drift from on_hand - reserved.
    available   int  GENERATED ALWAYS AS (on_hand - reserved) STORED,
    PRIMARY KEY (sku, location_id)
);

COMMENT ON TABLE inventory IS 'Stock position per SKU per location. Substitution needs to know not just whether stock exists but where.';

CREATE TABLE customers (
    customer_id    text PRIMARY KEY,
    name           text NOT NULL,
    email          text NOT NULL,
    -- Drives the goodwill credit policy in the meridian-customer-comms skill.
    loyalty_tier   text NOT NULL CHECK (loyalty_tier IN ('Summit', 'Trail', 'Basecamp')),
    lifetime_value numeric(10,2) NOT NULL
);

COMMENT ON TABLE customers IS 'Fictional customers. loyalty_tier drives the credit policy and the escalation threshold.';

CREATE TABLE orders (
    order_id        text PRIMARY KEY,
    customer_id     text      NOT NULL REFERENCES customers (customer_id),
    -- Fixed timestamps, never now()-relative. The same seed must produce the
    -- same ranking on any date, or the acceptance tests and eval set rot.
    order_ts        timestamp NOT NULL,
    channel         text      NOT NULL CHECK (channel IN ('ecom', 'marketplace', 'store')),
    ship_to_state   text      NOT NULL,
    ship_to_region  text      NOT NULL CHECK (ship_to_region IN ('us-west', 'us-east', 'us-central', 'us-south')),
    status          text      NOT NULL CHECK (status IN ('placed', 'exception', 'remediated', 'cancelled'))
);

COMMENT ON TABLE orders IS 'Customer orders. ship_to_region also supplies the {region} token in the event topic taxonomy.';

CREATE INDEX orders_status_idx ON orders (status);

CREATE TABLE order_lines (
    order_id   text NOT NULL REFERENCES orders (order_id),
    line_no    int  NOT NULL,
    sku        text NOT NULL REFERENCES products (sku),
    qty        int  NOT NULL CHECK (qty > 0),
    unit_price numeric(10,2) NOT NULL,
    -- Exceptions are line-level, because that is how fulfillment actually breaks.
    status     text NOT NULL CHECK (status IN ('ok', 'short', 'substituted', 'cancelled')),
    PRIMARY KEY (order_id, line_no)
);

COMMENT ON TABLE order_lines IS 'Order lines. A single short line puts the whole order into exception.';

CREATE INDEX order_lines_status_idx ON order_lines (status);

-- ---------------------------------------------------------------------------
-- Catalog tables, owned by merchandising
--
-- Read only by the product-catalog MCP server. If an attendee can answer a
-- catalog question through the SQL connector, the two-systems narrative
-- collapses and the MCP section loses its reason to exist.
-- ---------------------------------------------------------------------------

CREATE TABLE style_families (
    style_id    text PRIMARY KEY,
    family_id   text NOT NULL,
    family_name text NOT NULL
);

COMMENT ON TABLE style_families IS 'Merchandising view: which styles belong to the same family. Not an inventory fact.';

CREATE TABLE substitution_rules (
    style_id                 text PRIMARY KEY REFERENCES style_families (style_id),
    -- Business policy, versioned by merchandising. A constraint, not a preference.
    forbidden_color_families text[] NOT NULL DEFAULT '{}',
    max_size_delta           int    NOT NULL DEFAULT 1,
    notes                    text
);

COMMENT ON TABLE substitution_rules IS 'Merch-approved swap constraints. These are hard constraints the scoring tool enforces as exclusions.';

CREATE TABLE product_copy (
    sku            text PRIMARY KEY REFERENCES products (sku),
    marketing_copy text NOT NULL
);

COMMENT ON TABLE product_copy IS 'Product copy lives in the PIM, not the ops database. Used when drafting customer messages.';

COMMIT;
