# RentHub webhooks

Two intake points live under `/api/v1/webhooks`. Both are open to the internet
by definition, so both are shut unless configured and refuse anything that
cannot prove it is genuine.

## 1. General event webhook (provider-agnostic)

```
POST /api/v1/webhooks/events     # any event
POST /api/v1/webhooks/payment    # only payment.* events
POST /api/v1/webhooks/rental     # rental.* and rental_request.* events
```

Body (JSON):

```json
{ "event": "payment.succeeded", "id": "evt_123", "data": { "payment_id": 42 } }
```

- `event` — `<category>.<action>`. Categories handled: `payment`,
  `rental_request`, `rental`.
- `id` — your unique id for the event (logged for tracing; safe to retry on).
- `data` — the payload; the handler looks up the row by the ids/references in it.

### Security

Set `WEBHOOK_SECRET` in `.env` (leave empty to keep the intake **shut** → `503`).
A caller must prove it knows the secret, either way:

- **HMAC signature** (recommended): `X-RentHub-Signature: sha256=<hex>` where
  `<hex>` is `HMAC_SHA256(raw_body_bytes, WEBHOOK_SECRET)`. Sign the exact raw
  bytes — do not re-serialize the JSON.
- **Bearer token**: `Authorization: Bearer <WEBHOOK_SECRET>`.

A wrong/missing signature → `403`. Unknown event → `200` (acknowledged, not
retried). Invalid body → `422`.

### Events and what they do

| Event | Effect (idempotent) |
|---|---|
| `payment.succeeded` | `Payment.status → PAID` (matched by `payment_id` or `reference`). Audit-logged. Notifies the payer and, for a rental request, the owner. |
| `payment.failed` | `Payment.status → FAILED` (if still pending). |
| `rental_request.accepted` / `.rejected` / `.cancelled` / `.completed` | Moves the `RentalRequest` forward; never reopens a final one. Notifies the renter. |
| `rental.picked_up` / `.active` / `.returned` / `.completed` | Moves the `Rental` forward only (a late replay never drags it backwards). Sets `pickup_at` / `returned_at`. Notifies on completion. |

Every handler is **idempotent**: a provider that retries a delivered event gets
`200` with `"changed": false` and no duplicate side effects. The status change
commits with the request; the in-app notifications are pushed by a **background
task** so a slow push can never make the provider retry a success.

## 2. DC City callback (top-ups / TOP windows)

`POST /api/v1/webhooks/pay-dc` — the DC City form-encoded callback, secured by
`PAYDC_WEBHOOK_SECRET` (header `x-paydc-secret` or a body field). Unchanged.

## Nginx

No change is required: the existing site block already proxies `/api/` (which
covers `/api/v1/webhooks/...`) to the backend on `127.0.0.1:8000`, POST bodies
included. Webhooks are ordinary POSTs and need no special route.

## Testing locally

```bash
SECRET=$(grep '^WEBHOOK_SECRET=' .env | cut -d= -f2)
BODY='{"event":"payment.succeeded","data":{"payment_id":1}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -r | cut -d' ' -f1)
curl -sX POST http://127.0.0.1:8000/api/v1/webhooks/events \
  -H "Content-Type: application/json" \
  -H "X-RentHub-Signature: sha256=$SIG" \
  -d "$BODY"
```
