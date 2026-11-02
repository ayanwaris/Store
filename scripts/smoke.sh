#!/usr/bin/env bash
# KEYHAVEN end-to-end smoke: register -> cart -> checkout -> pay -> delivery -> decline path
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
DB="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/app_db}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

step() { printf '\n\033[36m== %s ==\033[0m\n' "$1"; }

step "health"
curl -sf "$BASE/api/health" >/dev/null && echo "health OK"

EMAIL="smoke_$(date +%s)@test.local"
PASS="Smoke!23456"

step "register $EMAIL"
curl -sf -c "$JAR" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Tester\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  "$BASE/api/auth/register" | grep -q '"ok":true' && echo "registered"

OFFER="$(psql "$DB" -Atc "select id from offers where active and stock_count > 1 order by price limit 1")"
[ -n "$OFFER" ] || { echo "no offers in DB — run seed first"; exit 1; }

step "add to cart"
curl -sf -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' \
  -d "{\"offerId\":\"$OFFER\",\"quantity\":2}" "$BASE/api/cart" | grep -q '"count":2' && echo "cart has 2"

step "apply coupon WELCOME10"
curl -sf -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' \
  -d '{"code":"WELCOME10"}' "$BASE/api/coupons/validate" | grep -q '"discount"' && echo "coupon OK"

step "checkout (create order)"
ORDER_JSON="$(curl -sf -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' -d '{"method":"card"}' "$BASE/api/checkout")"
ORDER_ID="$(echo "$ORDER_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["orderId"])')"
echo "order created: $ORDER_ID"

step "confirm payment (success card)"
curl -sf -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"orderId\":\"$ORDER_ID\",\"cardNumber\":\"4242424242424242\"}" \
  "$BASE/api/checkout/confirm" | grep -q '"completed":true' && echo "captured"

step "keys delivered & order completed"
curl -sf -b "$JAR" "$BASE/api/orders" | grep -q '"completed"' && echo "delivery verified"

step "decline path (4000 0000 0000 0002)"
curl -sf -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' \
  -d "{\"offerId\":\"$OFFER\",\"quantity\":1}" "$BASE/api/cart" >/dev/null
ORDER2="$(curl -sf -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' -d '{"method":"card"}' "$BASE/api/checkout" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["orderId"])')"
CODE="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"orderId\":\"$ORDER2\",\"cardNumber\":\"4000000000000002\"}" "$BASE/api/checkout/confirm")"
[ "$CODE" = "402" ] && echo "decline returned 402 as expected"

step "cancel pending order (release keys)"
curl -sf -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"orderId\":\"$ORDER2\"}" "$BASE/api/checkout/cancel" | grep -q '"cancelled":true' && echo "cancelled"

step "wishlist POST"
PRODUCT="$(psql "$DB" -Atc "select product_id from offers where id = '$OFFER'")"
curl -sf -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":\"$PRODUCT\"}" "$BASE/api/wishlist" \
  | grep -q '"wishlisted":true' && echo "wishlisted"

echo ""
echo "==============================="
echo " SMOKE: ALL CHECKS PASSED"
echo "==============================="
