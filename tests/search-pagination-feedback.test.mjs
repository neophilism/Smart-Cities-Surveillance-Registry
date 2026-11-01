import assert from "node:assert/strict";
import test from "node:test";
import { paginationHref, searchResultRange } from "../apps/web/lib/pagination.ts";
test("result navigation preserves multivalue filters and replaces stale page values", () => {
  const value = paginationHref("/registries/demo/search", {
    q: "policy & evidence", status: ["published", "archived"], page: ["1", "2"],
  }, 3, "search-results-heading");
  const url = new URL(value, "https://example.test");
  assert.equal(url.searchParams.get("q"), "policy & evidence");
  assert.deepEqual(url.searchParams.getAll("status"), ["published", "archived"]);
  assert.deepEqual(url.searchParams.getAll("page"), ["3"]);
  assert.equal(url.hash, "#search-results-heading");
});
test("shared pagination adds a result anchor only when the caller supplies a target", () => {
  assert.equal(new URL(paginationHref("/other", {}, 2), "https://example.test").hash, "");
  for (const page of [0, -1, NaN, Infinity, 1.5]) assert.throws(() => paginationHref("/other", {}, page));
});
test("result feedback distinguishes first, final, empty and out-of-range pages", () => {
  assert.equal(searchResultRange(51, 1, 25), "Showing records 1 to 25 of 51.");
  assert.equal(searchResultRange(51, 3, 25), "Showing records 51 to 51 of 51.");
  assert.equal(searchResultRange(0, 1, 25), "No matching public records.");
  assert.match(searchResultRange(51, 4, 25), /earlier pages/);
});
