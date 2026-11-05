#!/usr/bin/env bash
# Post-login redirect checks against a RUNNING app (npm run dev) with a seeded database.
#
#   BASE=http://localhost:3000 bash scripts/redirect-smoke.sh
#
# Optional env: DEMO_EMAIL / DEMO_PASS (default: the seeded demo buyer),
#               PRODUCT_SLUG (else the first active product is read with psql, via DATABASE_URL).
#
# Covers the server-side parts: destination validation in the login/register APIs, open-redirect
# rejection, the destination surviving login <-> register links, the logged-in /login redirect,
# and the guard redirects (/account, /checkout, ...). Browser-only behaviour (Reviews tab opening,
# scrolling, mobile menu, refresh) is in docs/POST_LOGIN_REDIRECT.md.
set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
DB="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/app_db}"
DEMO_EMAIL="${DEMO_EMAIL:-buyer@keyhaven.app}"
DEMO_PASS="${DEMO_PASS:-Buyer!23456}"
# The auth routes rate-limit per IP (10 / minute); use a fresh fake client IP for every run.
FAKE_IP="198.51.100.$((RANDOM % 250 + 1))"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

PASS=0; FAIL=0; WARN=0
pass() { PASS=$((PASS + 1)); printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf '  \033[31mFAIL\033[0m  %s\n        expected: %s\n        actual:   %s\n' "$1" "$2" "$3"; }
warn() { WARN=$((WARN + 1)); printf '  \033[33mWARN\033[0m  %s\n' "$1"; }
step() { printf '\n\033[36m== %s ==\033[0m\n' "$1"; }
expect_eq() { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "$3" "$2"; fi; }
expect_contains() { if printf '%s' "$2" | grep -qF -- "$3"; then pass "$1"; else fail "$1" "contains: $3" "(not found)"; fi; }
expect_not_contains() { if printf '%s' "$2" | grep -qF -- "$3"; then fail "$1" "must not contain: $3" "(found)"; else pass "$1"; fi; }

# post_json PATH JSON [extra curl args]  ->  sets CODE and BODY
post_json() {
  local path="$1" json="$2" out; shift 2
  out="$(curl -s -w $'\n%{http_code}' -H 'Content-Type: application/json' -H "X-Forwarded-For: $FAKE_IP" -d "$json" "$@" "$BASE$path")" || true
  CODE="${out##*$'\n'}"
  BODY="${out%$'\n'*}"
}
# redirectTo value from the last JSON response body ("" when absent)
redirect_to() { printf '%s' "$BODY" | grep -o '"redirectTo":"[^"]*"' | head -1 | sed 's/^"redirectTo":"//; s/"$//'; }

# redirect_target URL [curl args]  ->  where a page request redirects to ("" if it does not)
redirect_target() {
  local url="$1" resp loc; shift
  resp="$(curl -s -D - "$@" "$url" | tr -d '\r')"
  loc="$(printf '%s' "$resp" | grep -i -m1 '^location:' | sed 's/^[Ll]ocation: *//')"
  if [ -z "$loc" ]; then
    # Streamed responses can redirect with a <meta http-equiv="refresh" content="1;url=..."> tag.
    loc="$(printf '%s' "$resp" | grep -o 'http-equiv="refresh" content="[^"]*"' | head -1 | sed 's/.*content="[0-9]*;url=//; s/"$//')"
  fi
  printf '%s' "${loc#"$BASE"}"
}

step "health"
curl -sf "$BASE/api/health" >/dev/null && pass "app is reachable at $BASE" || { echo "App not reachable at $BASE — start it first (npm run dev)."; exit 1; }

# ---------------------------------------------------------------------------------------------
step "login API: destination is validated on the server"
LOGIN_ARGS=(-c "$JAR")
post_json /api/auth/login "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\",\"next\":\"/product/elden-ring#reviews\"}" "${LOGIN_ARGS[@]}"
expect_eq "login ok (HTTP 200)" "$CODE" "200"
expect_eq "valid next (path + hash) is returned" "$(redirect_to)" "/product/elden-ring#reviews"

post_json /api/auth/login "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\",\"next\":\"https://evil.com\"}"
expect_eq "external next rejected -> default /" "$(redirect_to)" "/"

post_json /api/auth/login "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASS\"}"
expect_eq "no next -> existing default /" "$(redirect_to)" "/"

post_json /api/auth/login "{\"email\":\"$DEMO_EMAIL\",\"password\":\"definitely-wrong\",\"next\":\"/product/elden-ring#reviews\"}"
expect_eq "failed login is rejected (HTTP 401)" "$CODE" "401"
expect_not_contains "failed login does not hand out a redirectTo" "$BODY" "redirectTo"

# ---------------------------------------------------------------------------------------------
step "register API: destination is validated on the server"
RUN="$(date +%s)"; N=0
check_register() { # LABEL NEXT_JSON_LITERAL EXPECTED
  N=$((N + 1))
  post_json /api/auth/register "{\"name\":\"Redirect Tester\",\"email\":\"redir_${RUN}_${N}@test.local\",\"password\":\"Redirect!23456\",\"next\":\"$2\"}"
  if [ "$CODE" != "201" ]; then fail "$1 (register HTTP 201)" "201" "$CODE"; return; fi
  expect_eq "$1" "$(redirect_to)" "$3"
}
check_register "valid path + hash kept"          '/product/elden-ring#reviews'  '/product/elden-ring#reviews'
check_register "valid path + query kept"         '/search?q=fifa&sort=popular'  '/search?q=fifa&sort=popular'
check_register "absolute URL rejected"           'https://evil.com'             '/'
check_register "protocol-relative rejected"      '//evil.com'                   '/'
check_register "backslash trick rejected"        '/\\evil.com'                  '/'
check_register "auth page rejected (loop guard)" '/login'                       '/'
check_register "API route rejected"              '/api/auth/logout'             '/'
check_register "encoded // rejected"             '/%2F/evil.com'                '/'

# ---------------------------------------------------------------------------------------------
step "login <-> register pages keep the destination"
PAGE="$(curl -s "$BASE/login?next=%2Fsell")"
expect_contains "login page: 'Create account' link carries next" "$PAGE" 'href="/register?next=%2Fsell"'
PAGE="$(curl -s "$BASE/register?next=%2Fsell")"
expect_contains "register page: 'Log in' link carries next" "$PAGE" 'href="/login?next=%2Fsell"'
PAGE="$(curl -s "$BASE/login?next=https%3A%2F%2Fevil.com")"
expect_not_contains "login page never exposes an external next" "$PAGE" "evil.com"
PAGE="$(curl -s "$BASE/login?next=%2Fsell")"
expect_contains "refreshing /login keeps next (it lives in the URL)" "$PAGE" 'href="/register?next=%2Fsell"'

# ---------------------------------------------------------------------------------------------
step "already logged in: /login honours only safe destinations"
expect_eq "/login?next=/sell -> /sell"            "$(redirect_target "$BASE/login?next=%2Fsell" -b "$JAR")" "/sell"
expect_eq "/login?next=https://evil.com -> /"     "$(redirect_target "$BASE/login?next=https%3A%2F%2Fevil.com" -b "$JAR")" "/"
expect_eq "/login (no next) -> existing default /" "$(redirect_target "$BASE/login" -b "$JAR")" "/"

# ---------------------------------------------------------------------------------------------
step "guarded pages send logged-out visitors to login, remembering the page (src/proxy.ts)"
expect_eq "/account"                "$(redirect_target "$BASE/account")"                "/login?next=%2Faccount"
expect_eq "/checkout"               "$(redirect_target "$BASE/checkout")"               "/login?next=%2Fcheckout"
expect_eq "/account/orders?page=2"  "$(redirect_target "$BASE/account/orders?page=2")"  "/login?next=%2Faccount%2Forders%3Fpage%3D2"
expect_eq "/order/KH-TEST"          "$(redirect_target "$BASE/order/KH-TEST")"          "/login?next=%2Forder%2FKH-TEST"

# ---------------------------------------------------------------------------------------------
step "product page: logged-out review prompt links to login with #reviews"
SLUG="${PRODUCT_SLUG:-}"
if [ -z "$SLUG" ] && command -v psql >/dev/null 2>&1; then
  SLUG="$(psql "$DB" -Atc "select slug from products where active order by created_at limit 1" 2>/dev/null || true)"
fi
if [ -z "$SLUG" ]; then
  warn "no product slug (set PRODUCT_SLUG=... or install psql) — skipped"
else
  PAGE="$(curl -s "$BASE/product/$SLUG")"
  WANT="/login?next=%2Fproduct%2F${SLUG}%23reviews"
  if printf '%s' "$PAGE" | grep -qF -- "$WANT"; then
    pass "review prompt links to $WANT"
  else
    # The Reviews tab is client-rendered, so its link may not be in the server HTML.
    warn "link not found in server HTML — verify in the browser (checklist scenario 1)"
  fi
fi

# ---------------------------------------------------------------------------------------------
printf '\n\033[1mResult: %d passed, %d failed, %d warnings\033[0m\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
