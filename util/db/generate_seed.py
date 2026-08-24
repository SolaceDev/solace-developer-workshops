#!/usr/bin/env python3
"""Generate util/db/02_seed.sql for the Meridian Outfitters workshop dataset.

Deterministic by construction: a fixed-seed PRNG, fixed dates, no now().
Re-running this produces a byte-identical file, so the substitution ranking
attendees see on the day matches the one in the guides.

The seed is hand-tuned around one canonical failing order, ORD-10428. The
outcomes below are the acceptance criterion for the data, the scoring tool,
and the guides together:

    CS-SLT-L   wins at default weights   same color, +1 size, in stock us-west
    CS-STN-M   wins at margin_weight 0.6 same family, exact size, better margin
    CS-MOS-M   hard fail                 color family forbidden by merch
    CS-SLT-XL  hard fail                 size delta exceeds +/-1

Usage: python3 util/db/generate_seed.py > util/db/02_seed.sql
"""

import random

SEED = 20260908  # Agent Con London. Fixed so output never drifts.
rng = random.Random(SEED)

SIZES = [("XS", 1), ("S", 2), ("M", 3), ("L", 4), ("XL", 5)]

# --------------------------------------------------------------------------
# Locations: 4 DCs, 8 stores, 4 regions.
# ST-1042 is the store in the canonical topic retail/order/exception/us-west/1042.
# ST-2201 stocks the Cascade Shell but cannot ship ecom, which is the seeded
# "only stock is at a store that cannot fulfill" case.
# --------------------------------------------------------------------------
LOCATIONS = [
    ("DC-WEST",    "West Distribution Center",    "dc",    "us-west",    "OR", True),
    ("DC-EAST",    "East Distribution Center",    "dc",    "us-east",    "PA", True),
    ("DC-CENTRAL", "Central Distribution Center", "dc",    "us-central", "IL", True),
    ("DC-SOUTH",   "South Distribution Center",   "dc",    "us-south",   "TX", True),
    ("ST-1042", "Portland Pearl District", "store", "us-west",    "OR", True),
    ("ST-1108", "Seattle Ballard",         "store", "us-west",    "WA", True),
    ("ST-2201", "Denver Cherry Creek",     "store", "us-central", "CO", False),
    ("ST-2318", "Chicago Lincoln Park",    "store", "us-central", "IL", True),
    ("ST-3104", "Boston Back Bay",         "store", "us-east",    "MA", True),
    ("ST-3277", "Brooklyn Williamsburg",   "store", "us-east",    "NY", False),
    ("ST-4150", "Austin South Congress",   "store", "us-south",   "TX", True),
    ("ST-4402", "Atlanta Westside",        "store", "us-south",   "GA", True),
]

REGIONS = ["us-west", "us-east", "us-central", "us-south"]

# --------------------------------------------------------------------------
# Styles. The Cascade Shell (CS) is the canonical style and is hand-specified;
# the rest are generated to give the dataset realistic breadth.
# --------------------------------------------------------------------------
CS_COLORS = [
    ("Slate",   "neutral", "SLT"),
    ("Stone",   "neutral", "STN"),
    ("Moss",    "bright",  "MOS"),  # forbidden family for CS. Hard fail.
]

GENERATED_STYLES = [
    ("RD", "Ridgeline Down Parka",    "jackets",  219.00, 94.00,  "FW25"),
    ("AL", "Alpine Fleece Half-Zip",  "jackets",  129.00, 52.00,  "FW25"),
    ("TW", "Timberline Work Jacket",  "jackets",  169.00, 71.00,  "FW25"),
    ("SB", "Stormbreak Rain Shell",   "jackets",  199.00, 83.00,  "FW25"),
    ("GL", "Glacier Insulated Vest",  "jackets",  109.00, 44.00,  "FW25"),
    ("HB", "Headwall Bibs",           "jackets",  249.00, 108.00, "FW25"),
    ("CV", "Cirrus Windbreaker",      "jackets",   99.00, 38.00,  "SS26"),
    ("SM", "Summit Softshell",        "jackets",  159.00, 66.00,  "FW25"),
    ("TR", "Traverse 34L Pack",       "packs",    139.00, 55.00,  "FW25"),
    ("BC", "Basecamp 55L Pack",       "packs",    189.00, 79.00,  "FW25"),
    ("DP", "Daypack 18L",             "packs",     79.00, 29.00,  "SS26"),
    ("SP", "Summit Pack 40L",         "packs",    169.00, 70.00,  "FW25"),
    ("HL", "Haul Duffel 60L",         "packs",    119.00, 47.00,  "SS26"),
    ("TL", "Trailhead Hiker",         "footwear", 149.00, 61.00,  "FW25"),
    ("SC", "Scree Approach Shoe",     "footwear", 129.00, 51.00,  "SS26"),
    ("TB", "Timber Boot",             "footwear", 189.00, 80.00,  "FW25"),
    ("RN", "Runoff Trail Runner",     "footwear", 119.00, 45.00,  "SS26"),
    ("CM", "Camp Slip-On",            "footwear",  69.00, 25.00,  "SS26"),
]

COLORWAYS = [
    ("Black",     "neutral", "BLK"),
    ("Slate",     "neutral", "SLT"),
    ("Stone",     "neutral", "STN"),
    ("Clay",      "earth",   "CLY"),
    ("Juniper",   "earth",   "JNP"),
    ("Ember",     "bright",  "EMB"),
]

# Merchandising families group styles that are genuinely interchangeable, not
# everything in a category. A customer who wanted a waterproof shell will accept
# another waterproof shell; they will not accept a fleece or a pair of bibs.
# Getting this granularity right is what keeps the candidate list small enough
# for an agent to reason about.
STYLE_FAMILY = {
    # Waterproof shells: same job, same weather, interchangeable.
    "CS": ("FAM-SHELL",  "Waterproof Shells"),
    "SB": ("FAM-SHELL",  "Waterproof Shells"),
    "TW": ("FAM-SHELL",  "Waterproof Shells"),
    # Insulated outerwear.
    "RD": ("FAM-INSUL",  "Insulated Outerwear"),
    "GL": ("FAM-INSUL",  "Insulated Outerwear"),
    # Midlayers: worn under a shell, not instead of one.
    "AL": ("FAM-MIDLYR", "Midlayers"),
    "SM": ("FAM-MIDLYR", "Midlayers"),
    "CV": ("FAM-MIDLYR", "Midlayers"),
    # Snow bibs stand alone. Nothing else in the line substitutes for them.
    "HB": ("FAM-SNOW",   "Snow Bibs"),
    # Carry, split by how much it holds.
    "DP": ("FAM-DAYPK",  "Daypacks"),
    "TR": ("FAM-DAYPK",  "Daypacks"),
    "BC": ("FAM-HAUL",   "Haul Packs"),
    "SP": ("FAM-HAUL",   "Haul Packs"),
    "HL": ("FAM-DUFFEL", "Duffels"),
    # Footwear, split by whether it is a boot.
    "TL": ("FAM-BOOT",   "Hiking Boots"),
    "TB": ("FAM-BOOT",   "Hiking Boots"),
    "SC": ("FAM-TRAIL",  "Trail Shoes"),
    "RN": ("FAM-TRAIL",  "Trail Shoes"),
    "CM": ("FAM-CAMP",   "Camp Shoes"),
}


def q(s):
    """Quote a SQL string literal."""
    return "'" + str(s).replace("'", "''") + "'"


products = []      # (sku, style_id, name, category, color, color_family, size, ord, list, cost, season)
inventory = {}     # (sku, location_id) -> (on_hand, reserved)


def add_product(sku, style_id, name, category, color, family, size, ordinal,
                list_price, unit_cost, season):
    products.append((sku, style_id, name, category, color, family, size,
                     ordinal, list_price, unit_cost, season))


# --------------------------------------------------------------------------
# The Cascade Shell, hand-built so the ORD-10428 outcomes are exact.
#
# Margin is the lever the lab pulls. Slate L has slightly WORSE margin than
# the original; Stone M has clearly BETTER margin. At default weights the
# size/color/distance terms carry Slate L; raise margin_weight to 0.6 and
# Stone M overtakes it.
# --------------------------------------------------------------------------
CS_LIST = 189.00
CS_COST = {
    ("SLT", 1): 82.00, ("SLT", 2): 82.00, ("SLT", 3): 82.00,
    ("SLT", 4): 86.00,                     # +1 size, thinner margin
    ("SLT", 5): 86.00,
    ("STN", 1): 74.00, ("STN", 2): 74.00,
    ("STN", 3): 71.00,                     # exact size, fattest margin
    ("STN", 4): 74.00, ("STN", 5): 74.00,
    ("MOS", 1): 80.00, ("MOS", 2): 80.00, ("MOS", 3): 80.00,
    ("MOS", 4): 80.00, ("MOS", 5): 80.00,
}

for color, family, code in CS_COLORS:
    for size, ordinal in SIZES:
        add_product(f"CS-{code}-{size}", "CS", "Cascade Shell Jacket", "jackets",
                    color, family, size, ordinal, CS_LIST,
                    CS_COST[(code, ordinal)], "FW25")

# Cascade Shell stock, hand-placed.
#   CS-SLT-M   the ordered SKU: zero everywhere. This is the exception.
#   CS-SLT-L   deep stock in DC-WEST: same region as ship-to, so 2 days.
#   CS-STN-M   stock in DC-EAST only: cross-country, slower, but better margin.
#   CS-MOS-M   plenty of stock, but the color family is forbidden. Rejected.
#   CS-SLT-XL  stock exists, but size delta 2 exceeds max_size_delta 1. Rejected.
CASCADE_STOCK = {
    ("CS-SLT-XS", "DC-WEST"): (4, 0),
    ("CS-SLT-S",  "DC-WEST"): (6, 1),
    ("CS-SLT-M",  "DC-WEST"): (0, 0),
    ("CS-SLT-M",  "DC-EAST"): (0, 0),
    ("CS-SLT-M",  "ST-1042"): (2, 2),   # on hand but fully reserved: available 0
    ("CS-SLT-L",  "DC-WEST"): (12, 0),  # the default winner
    ("CS-SLT-L",  "ST-1108"): (3, 1),
    ("CS-SLT-XL", "DC-WEST"): (7, 0),   # rejected on size delta, not stock
    ("CS-STN-M",  "DC-EAST"): (9, 0),   # the margin-weighted winner
    ("CS-STN-M",  "ST-3104"): (2, 0),
    ("CS-STN-L",  "DC-EAST"): (5, 0),
    ("CS-MOS-M",  "DC-WEST"): (8, 0),   # rejected on forbidden color family
    ("CS-MOS-L",  "DC-WEST"): (6, 0),
    # Only stock at a store that cannot ship ecom.
    ("CS-STN-XL", "ST-2201"): (4, 0),
}
inventory.update(CASCADE_STOCK)

# --------------------------------------------------------------------------
# Remaining styles, generated. Mid sizes short more often than end sizes,
# which is realistic and makes size-proximity scoring matter.
# --------------------------------------------------------------------------
for style_id, name, category, list_price, unit_cost, season in GENERATED_STYLES:
    n_colors = rng.choice([3, 4])
    colors = rng.sample(COLORWAYS, n_colors)
    sizes = SIZES if rng.random() < 0.7 else SIZES[:4]
    for color, family, code in colors:
        # Colorway-level cost jitter, deterministic under the fixed seed.
        cost = round(unit_cost + rng.choice([-3.0, -1.5, 0.0, 1.5, 3.0]), 2)
        for size, ordinal in sizes:
            sku = f"{style_id}-{code}-{size}"
            add_product(sku, style_id, name, category, color, family, size,
                        ordinal, list_price, cost, season)

            # Stock this SKU at a deterministic subset of locations.
            for loc_id, _, loc_type, _, _, _ in LOCATIONS:
                stocked = rng.random() < (0.75 if loc_type == "dc" else 0.45)
                if not stocked:
                    continue
                mid = ordinal in (3, 4)          # M and L run short
                if mid and rng.random() < 0.30:
                    on_hand, reserved = rng.randint(0, 2), 0
                else:
                    base = rng.randint(3, 18) if loc_type == "dc" else rng.randint(1, 7)
                    on_hand = base
                    reserved = rng.randint(0, min(2, base))
                inventory[(sku, loc_id)] = (on_hand, reserved)

# A style where every substitute hard-fails, so cancel-and-refund is reachable.
# Camp Slip-On is discontinued in every size but the one that is gone.
for (sku, loc) in list(inventory.keys()):
    if sku.startswith("CM-"):
        del inventory[(sku, loc)]

# --------------------------------------------------------------------------
# Customers. Fictional names, @example.com only. These appear in agent-drafted
# messages and therefore in screenshots and recordings.
# --------------------------------------------------------------------------
FIRST = ["Rowan", "Marta", "Devin", "Priya", "Callum", "Ines", "Tobias", "Nadia",
         "Emeka", "Sofia", "Bram", "Yuki", "Adaeze", "Kasper", "Leila", "Oskar",
         "Renata", "Milo", "Farida", "Anton"]
LAST = ["Hollis", "Vance", "Okonjo", "Rasmussen", "Delacroix", "Ferrante",
        "Nakamura", "Bergstrom", "Achebe", "Lindqvist", "Moreau", "Sandoval"]

customers = []
seen_names = set()
for i in range(60):
    while True:
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        if name not in seen_names:
            seen_names.add(name)
            break
    cid = f"CUST-{5000 + i}"
    tier = rng.choices(["Summit", "Trail", "Basecamp"], weights=[2, 4, 4])[0]
    ltv = {"Summit": rng.randint(3200, 9800),
           "Trail": rng.randint(900, 3100),
           "Basecamp": rng.randint(120, 880)}[tier]
    email = name.lower().replace(" ", ".") + "@example.com"
    customers.append((cid, name, email, tier, float(ltv)))

# The canonical customer for ORD-10428: Summit tier, high lifetime value.
customers[0] = ("CUST-5000", "Rowan Hollis", "rowan.hollis@example.com",
                "Summit", 7420.00)

# --------------------------------------------------------------------------
# Orders. 200 total, 30 in exception. ORD-10428 is hand-built.
# --------------------------------------------------------------------------
STATE_BY_REGION = {
    "us-west": ["OR", "WA", "CA", "NV"],
    "us-east": ["MA", "NY", "PA", "NJ"],
    "us-central": ["IL", "CO", "MN", "OH"],
    "us-south": ["TX", "GA", "FL", "NC"],
}

orders = []
order_lines = []
sellable = [p for p in products if not p[0].startswith("CM-")]

# Fixed base date. Nothing in this seed is relative to the current date.
BASE_DATE = "2025-11-0"

for i in range(200):
    oid = f"ORD-{10300 + i}"
    if oid == "ORD-10428":
        continue
    cust = rng.choice(customers)
    region = rng.choice(REGIONS)
    state = rng.choice(STATE_BY_REGION[region])
    day = rng.randint(1, 9)
    hour = rng.randint(8, 20)
    minute = rng.choice([0, 7, 14, 22, 31, 38, 45, 53])
    ts = f"{BASE_DATE}{day} {hour:02d}:{minute:02d}:00"
    channel = rng.choices(["ecom", "marketplace", "store"], weights=[6, 2, 2])[0]

    # 30 exceptions (29 here plus the canonical ORD-10428) and 20
    # already-remediated cases for the take-home evaluation dataset.
    if i < 29:
        status, line_status = "exception", "short"
    elif i < 49:
        status, line_status = "remediated", "substituted"
    else:
        status, line_status = "placed", "ok"

    orders.append((oid, cust[0], ts, channel, state, region, status))
    for line_no in range(1, rng.choice([1, 1, 2]) + 1):
        p = rng.choice(sellable)
        ls = line_status if line_no == 1 else "ok"
        order_lines.append((oid, line_no, p[0], rng.choice([1, 1, 1, 2]),
                            p[8], ls))

# The canonical failing order.
orders.append(("ORD-10428", "CUST-5000", "2025-11-04 09:14:00", "ecom",
               "OR", "us-west", "exception"))
order_lines.append(("ORD-10428", 1, "CS-SLT-M", 1, CS_LIST, "short"))

orders.sort(key=lambda o: o[0])
order_lines.sort(key=lambda l: (l[0], l[1]))

# --------------------------------------------------------------------------
# Catalog tables.
# --------------------------------------------------------------------------
all_styles = ["CS"] + [s[0] for s in GENERATED_STYLES]
style_category = {"CS": "jackets"}
for s in GENERATED_STYLES:
    style_category[s[0]] = s[2]

style_families = []
for sid in all_styles:
    fam_id, fam_name = STYLE_FAMILY[sid]
    style_families.append((sid, fam_id, fam_name))

sub_rules = []
for sid in all_styles:
    if sid == "CS":
        # The rule that rejects CS-MOS-M and caps size delta at 1.
        sub_rules.append((sid, ["bright"], 1,
                          "Cascade Shell is a core neutral program. "
                          "Bright colorways are not approved substitutes."))
    else:
        forbidden = rng.choice([[], [], ["bright"], ["earth"]])
        sub_rules.append((sid, forbidden, rng.choice([1, 1, 2]), None))

COPY = {
    "CS-SLT-L": "The Cascade Shell in Slate. A three-layer waterproof shell "
                "built for shoulder-season weather, with taped seams and a "
                "helmet-compatible hood.",
    "CS-STN-M": "The Cascade Shell in Stone. The same three-layer waterproof "
                "build in a warmer neutral, with taped seams and a "
                "helmet-compatible hood.",
    "CS-SLT-M": "The Cascade Shell in Slate. A three-layer waterproof shell "
                "built for shoulder-season weather.",
}
product_copy = []
for p in products:
    sku = p[0]
    if sku in COPY:
        product_copy.append((sku, COPY[sku]))
    else:
        product_copy.append((sku, f"The {p[2]} in {p[4]}. "
                                  f"Built for the trail in {p[10]}."))

# --------------------------------------------------------------------------
# Emit
# --------------------------------------------------------------------------
out = []
w = out.append

w("-- Meridian Outfitters seed data")
w("--")
w("-- GENERATED FILE. Do not edit by hand.")
w("-- Regenerate with: python3 util/db/generate_seed.py > util/db/02_seed.sql")
w("--")
w("-- Deterministic: fixed PRNG seed, fixed dates, no now(). The same seed")
w("-- produces the same substitution ranking on any date.")
w("--")
w("-- Canonical failing order: ORD-10428, Cascade Shell Jacket, Slate, size M,")
w("-- shipping to Oregon. Zero available at every location.")
w("")
w("BEGIN;")
w("")
w("TRUNCATE order_lines, orders, inventory, product_copy, substitution_rules,")
w("         style_families, products, locations, customers RESTART IDENTITY CASCADE;")
w("")

w("-- Locations: 4 DCs, 8 stores, 4 regions.")
w("INSERT INTO locations (location_id, name, type, region, state, ships_ecom) VALUES")
rows = [f"  ({q(l[0])}, {q(l[1])}, {q(l[2])}, {q(l[3])}, {q(l[4])}, {str(l[5]).lower()})"
        for l in LOCATIONS]
w(",\n".join(rows) + ";")
w("")

w(f"-- Products: {len(products)} SKUs across {len(all_styles)} styles.")
w("INSERT INTO products (sku, style_id, name, category, color, color_family, size, size_ordinal, list_price, unit_cost, season) VALUES")
rows = [f"  ({q(p[0])}, {q(p[1])}, {q(p[2])}, {q(p[3])}, {q(p[4])}, {q(p[5])}, "
        f"{q(p[6])}, {p[7]}, {p[8]:.2f}, {p[9]:.2f}, {q(p[10])})" for p in products]
w(",\n".join(rows) + ";")
w("")

inv_rows = sorted(inventory.items())
w(f"-- Inventory: {len(inv_rows)} positions. Deliberate gaps; not every SKU is")
w("-- stocked at every location. available is generated as on_hand - reserved.")
w("INSERT INTO inventory (sku, location_id, on_hand, reserved) VALUES")
rows = [f"  ({q(k[0])}, {q(k[1])}, {v[0]}, {v[1]})" for k, v in inv_rows]
w(",\n".join(rows) + ";")
w("")

w(f"-- Customers: {len(customers)}, across all three loyalty tiers.")
w("INSERT INTO customers (customer_id, name, email, loyalty_tier, lifetime_value) VALUES")
rows = [f"  ({q(c[0])}, {q(c[1])}, {q(c[2])}, {q(c[3])}, {c[4]:.2f})" for c in customers]
w(",\n".join(rows) + ";")
w("")

n_exc = sum(1 for o in orders if o[6] == "exception")
n_rem = sum(1 for o in orders if o[6] == "remediated")
w(f"-- Orders: {len(orders)} total, {n_exc} in exception, {n_rem} remediated")
w("-- (the remediated set is the take-home evaluation dataset).")
w("INSERT INTO orders (order_id, customer_id, order_ts, channel, ship_to_state, ship_to_region, status) VALUES")
rows = [f"  ({q(o[0])}, {q(o[1])}, {q(o[2])}, {q(o[3])}, {q(o[4])}, {q(o[5])}, {q(o[6])})"
        for o in orders]
w(",\n".join(rows) + ";")
w("")

w(f"-- Order lines: {len(order_lines)}. Exceptions are line-level.")
w("INSERT INTO order_lines (order_id, line_no, sku, qty, unit_price, status) VALUES")
rows = [f"  ({q(l[0])}, {l[1]}, {q(l[2])}, {l[3]}, {l[4]:.2f}, {q(l[5])})"
        for l in order_lines]
w(",\n".join(rows) + ";")
w("")

w("-- ------------------------------------------------------------------")
w("-- Catalog tables, owned by merchandising. Read only by the")
w("-- product-catalog MCP server, never by the SQL connector.")
w("-- ------------------------------------------------------------------")
w("")
w("INSERT INTO style_families (style_id, family_id, family_name) VALUES")
rows = [f"  ({q(s[0])}, {q(s[1])}, {q(s[2])})" for s in style_families]
w(",\n".join(rows) + ";")
w("")

w("-- Merch-approved swap constraints. The CS rule is what rejects CS-MOS-M")
w("-- (forbidden color family) and CS-SLT-XL (size delta 2 exceeds max 1).")
w("INSERT INTO substitution_rules (style_id, forbidden_color_families, max_size_delta, notes) VALUES")
rows = []
for sid, forbidden, max_delta, notes in sub_rules:
    arr = "ARRAY[]::text[]" if not forbidden else \
          "ARRAY[" + ", ".join(q(f) for f in forbidden) + "]"
    rows.append(f"  ({q(sid)}, {arr}, {max_delta}, {q(notes) if notes else 'NULL'})")
w(",\n".join(rows) + ";")
w("")

w("INSERT INTO product_copy (sku, marketing_copy) VALUES")
rows = [f"  ({q(c[0])}, {q(c[1])})" for c in product_copy]
w(",\n".join(rows) + ";")
w("")
w("COMMIT;")
w("")

print("\n".join(out))
