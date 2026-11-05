# Post-login redirect

Visitors who are sent to log in return to the page they were on, including the query string and
the `#section` (for example `/product/<slug>#reviews`).

## How it works

- The destination travels in the `?next=` query parameter on `/login` and `/register`. It lives in
  the URL, so it survives page refreshes, failed login attempts and switching between the two pages.
  A `#hash` is encoded inside the value (`%23reviews`), because browsers never send hashes to the server.
- **Validation** is in one place, `src/lib/redirect.ts` (`sanitizeNext`). Only same-site paths are accepted.
  Absolute URLs, `//host`, backslashes, encoded and double-encoded variants, control characters, dot-segment
  tricks, values over 2000 characters, auth pages (`/login`, `/register`, `/forgot-password`,
  `/reset-password`) and `/api/*` are rejected. A rejected or missing value means the existing default (`/`).
- It is validated again on the server in `POST /api/auth/login` and `POST /api/auth/register`
  (the response carries a safe `redirectTo`), in the `/login` and `/register` pages, and in the server guards.
  The client never decides the final destination on its own.
- **Server guards** (`requireUser` / `requireAdmin` / `requireSeller` in `src/lib/auth.ts`) read the current
  path and query from a header set by `src/proxy.ts`, and redirect to `/login?next=<that page>`.
- **Client links** (`AuthLink` in the header, the wishlist button, the review form's expired-session
  handling, the product page's review prompt) build the same URL with `buildLoginUrl` / `buildRegisterUrl`.
- No social login exists in this project, so there is nothing to wire up for it. When one is added, pass the
  same `next` value through its start and callback routes and run it through `sanitizeNext` on the callback.
- Not covered by design: the destination is not carried through the forgot-password / reset-password email flow.
- A review is never submitted automatically after login; the visitor presses "Publish review" themselves.

## Automated checks

```bash
npm run typecheck
npm run lint
npx tsx --test scripts/redirect.test.ts          # validator unit tests
npm run dev                                       # in another terminal, with the database seeded
bash scripts/redirect-smoke.sh                    # BASE=http://localhost:3000 by default
```

## Manual browser checklist

Use a private window so you start logged out. Seeded demo buyer: `buyer@keyhaven.app` / `Buyer!23456`.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Review prompt returns to the review section | Open a product page, open the **Reviews** tab, click **Log in** in the "Review this product" card, log in. | You land on the same product page, the **Reviews** tab is open and in view, and nothing was submitted. |
| 2 | Protected product action | On a product page click **Wishlist** while logged out, log in. | You return to the same product page (query string kept). Press Wishlist again to save it. |
| 3 | Normal login, default redirect | Open `/login` directly (no `?next=`), log in. | You land on `/`, as before. |
| 4 | Login <-> registration | From a product's review prompt open login, click **Create account**; on the register page click **Log in**; also use the header **Sign up** / **Log in** while on those pages. | The address bar keeps `?next=%2Fproduct%2F...%23reviews` on every page. Registering returns you to the product's Reviews tab. |
| 5 | Failed login | Start as in scenario 1, enter a wrong password, then the right one. | The error toast appears, the URL still has `next`, and the correct password returns you to the Reviews tab. |
| 6 | Invalid external redirect | Visit `/login?next=https://evil.com`, `/login?next=//evil.com`, `/login?next=/%2F/evil.com`, then log in. Also log in first and visit these URLs again. | The login page works normally, you land on `/`, and you are never sent off-site. |
| 7 | Refresh | On `/login?next=...` press refresh (several times), then log in. | The destination is unchanged. |
| 8 | Mobile | Repeat 1, 4 and 5 on a phone or a narrow window, and also use **Log in** / **Sign up** from the mobile menu. | Same results. The mobile menu links return you to the page you were on. |
| 9 | Social login | n/a | The project has no social login (see above). |
| 10 | Protected pages | While logged out open `/checkout`, `/account`, `/account/orders?page=2`, `/order/<number>`. Log in each time. | Each login returns you to that exact page. A non-admin opening `/admin` still ends up on `/` (existing behaviour, no loop). |
| 11 | Expired session | Open the review form as a buyer, delete the `kh_session` cookie, press **Publish review**. | You are sent to login, and after logging in you return to `#reviews`. The review is not submitted until you press the button again. |
| 12 | Existing links | On a product with `?region=...` in the URL, repeat scenario 1. | The query string is kept after login. |
