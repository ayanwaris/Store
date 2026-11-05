/**
 * Unit tests for src/lib/redirect.ts
 * Run:  npx tsx --test scripts/redirect.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_REDIRECT,
  buildLoginUrl,
  buildRegisterUrl,
  locationToNext,
  resolveNext,
  sanitizeNext,
} from "../src/lib/redirect";

test("accepts internal paths and preserves query + hash", () => {
  assert.equal(sanitizeNext("/"), "/");
  assert.equal(sanitizeNext("/sell"), "/sell");
  assert.equal(sanitizeNext("/product/elden-ring"), "/product/elden-ring");
  assert.equal(sanitizeNext("/product/elden-ring#reviews"), "/product/elden-ring#reviews");
  assert.equal(sanitizeNext("/search?q=fifa&sort=popular"), "/search?q=fifa&sort=popular");
  assert.equal(
    sanitizeNext("/product/elden-ring?region=EU#reviews"),
    "/product/elden-ring?region=EU#reviews",
  );
});

test("takes the first value when searchParams gives an array", () => {
  assert.equal(sanitizeNext(["/sell", "/other"]), "/sell");
});

test("rejects non-strings and empty values", () => {
  for (const v of [undefined, null, 42, {}, "", "   ", []]) assert.equal(sanitizeNext(v), null);
});

test("rejects absolute and scheme URLs", () => {
  for (const v of [
    "https://evil.com",
    "http://evil.com/x",
    "javascript:alert(1)",
    "data:text/html,<script>1</script>",
    "evil.com",
    "product/x", // not root-relative
  ]) {
    assert.equal(sanitizeNext(v), null, v);
  }
});

test("rejects protocol-relative and backslash tricks", () => {
  for (const v of [
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/%5Cevil.com",
    "/%5cevil.com",
    "/path\\..\\evil",
  ]) {
    assert.equal(sanitizeNext(v), null, v);
  }
});

test("rejects dot-segment normalisation that creates //host", () => {
  assert.equal(sanitizeNext("/.//evil.com"), null);
  assert.equal(sanitizeNext("/a/..//evil.com"), null);
});

test("rejects encoded and double-encoded protocol-relative paths", () => {
  assert.equal(sanitizeNext("/%2F/evil.com"), null); // decodes to "//evil.com"
  assert.equal(sanitizeNext("/%252F/evil.com"), null); // double-encoded
  assert.equal(sanitizeNext("/%255Cevil.com"), null); // double-encoded backslash
});

test("rejects control characters (tab/newline/CR/NUL) raw or encoded", () => {
  for (const v of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/a\u0000b", "/%09/evil.com", "/%0a/evil.com"]) {
    assert.equal(sanitizeNext(v), null, JSON.stringify(v));
  }
});

test("rejects malformed percent-encoding", () => {
  assert.equal(sanitizeNext("/%E0%A4%A"), null);
  assert.equal(sanitizeNext("/%"), null);
});

test("rejects over-long values", () => {
  assert.equal(sanitizeNext("/" + "a".repeat(2000)), null);
  assert.ok(sanitizeNext("/" + "a".repeat(1000)));
});

test("rejects auth pages (redirect-loop protection), case-insensitive", () => {
  for (const v of [
    "/login",
    "/login?next=/sell",
    "/Login",
    "/register",
    "/register#x",
    "/forgot-password",
    "/reset-password?token=abc",
    "/login/",
  ]) {
    assert.equal(sanitizeNext(v), null, v);
  }
});

test("rejects API routes and Next internals", () => {
  for (const v of ["/api", "/api/auth/logout", "/API/orders", "/_next/static/x.js"]) {
    assert.equal(sanitizeNext(v), null, v);
  }
});

test("does not over-block pages that merely start with a blocked word", () => {
  assert.equal(sanitizeNext("/login-help"), "/login-help");
  assert.equal(sanitizeNext("/registered-sellers"), "/registered-sellers");
  assert.equal(sanitizeNext("/apiary"), "/apiary");
});

test("normalises dot-segments safely", () => {
  assert.equal(sanitizeNext("/product/a/../b#reviews"), "/product/b#reviews");
});

test("resolveNext falls back to the existing default", () => {
  assert.equal(DEFAULT_REDIRECT, "/");
  assert.equal(resolveNext(undefined), "/");
  assert.equal(resolveNext("https://evil.com"), "/");
  assert.equal(resolveNext("/sell"), "/sell");
});

test("buildLoginUrl / buildRegisterUrl carry a valid destination, encoded", () => {
  assert.equal(buildLoginUrl(), "/login");
  assert.equal(buildLoginUrl("https://evil.com"), "/login");
  assert.equal(buildLoginUrl("/login"), "/login");
  assert.equal(
    buildLoginUrl("/product/elden-ring#reviews"),
    "/login?next=%2Fproduct%2Felden-ring%23reviews",
  );
  assert.equal(buildRegisterUrl("/sell"), "/register?next=%2Fsell");
});

test("round trip: built URL's next param re-validates to the original (hash included)", () => {
  const original = "/product/elden-ring?region=EU#reviews";
  const url = new URL(buildLoginUrl(original), "http://x.test");
  assert.equal(url.searchParams.get("next"), original);
  assert.equal(sanitizeNext(url.searchParams.get("next")), original);
});

test("locationToNext joins pathname, search and hash", () => {
  assert.equal(locationToNext({ pathname: "/product/x", search: "?a=1", hash: "#reviews" }), "/product/x?a=1#reviews");
  assert.equal(locationToNext({ pathname: "/product/x" }), "/product/x");
});
