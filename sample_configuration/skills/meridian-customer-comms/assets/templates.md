# Resolution message templates

Four outcomes. Fill the bracketed slots from tool results only. If a slot has
no tool-supplied value, rewrite the sentence rather than guessing.

---

## 1. Substitution offered

Use when a scored substitute passed every hard constraint and the customer
should choose.

> Subject: About your order [ORDER_ID]
>
> Hi [FIRST_NAME],
>
> The [ORIGINAL_PRODUCT] in [ORIGINAL_SIZE] sold out before we could pack your
> order. We have the [SUBSTITUTE_PRODUCT] ready to ship instead, and it arrives
> in [DAYS] days.
>
> Reply to swap it, or reply "cancel" and we will refund [LINE_TOTAL] today.
> Either way you are not charged twice.
>
> [SIGN_OFF]

---

## 2. Substitution applied automatically

Use only when the customer has standing authorization for automatic swaps.

> Subject: A change to your order [ORDER_ID]
>
> Hi [FIRST_NAME],
>
> The [ORIGINAL_PRODUCT] in [ORIGINAL_SIZE] sold out, so we sent the
> [SUBSTITUTE_PRODUCT] instead. It ships from [LOCATION_NAME] and arrives in
> [DAYS] days.
>
> If it is not right, send it back free within 60 days.
>
> [SIGN_OFF]

---

## 3. Backorder, no date

Use when nothing acceptable is in stock but the customer wants to wait. Note
there is no date in this template, and none may be added.

> Subject: About your order [ORDER_ID]
>
> Hi [FIRST_NAME],
>
> The [ORIGINAL_PRODUCT] in [ORIGINAL_SIZE] is out of stock and we do not have
> a firm restock date yet. We are holding your order.
>
> We will email you the day it ships. If you would rather not wait, reply
> "cancel" and we will refund [LINE_TOTAL] the same day.
>
> [SIGN_OFF]

---

## 4. Cancel and refund

Use when every candidate hard-failed.

> Subject: We cancelled part of your order [ORDER_ID]
>
> Hi [FIRST_NAME],
>
> We could not fill the [ORIGINAL_PRODUCT] in [ORIGINAL_SIZE], and nothing we
> carry is a close enough match to send in its place. We have refunded
> [LINE_TOTAL] to your original payment method. It lands in three to five
> business days.
>
> [CREDIT_SENTENCE]
>
> [SIGN_OFF]

---

## Slot rules

| Slot | Source |
|---|---|
| `[ORDER_ID]`, `[ORIGINAL_PRODUCT]`, `[ORIGINAL_SIZE]`, `[LINE_TOTAL]` | the orders and products query |
| `[SUBSTITUTE_PRODUCT]`, `[DAYS]`, `[LOCATION_NAME]` | the `score_substitutes` result, top ranked candidate |
| `[FIRST_NAME]` | the customers query |
| `[CREDIT_SENTENCE]` | the credit policy in `SKILL.md`, omitted entirely when the authorized credit is $0 |

`[SIGN_OFF]` is always:

> Meridian Outfitters Customer Care
