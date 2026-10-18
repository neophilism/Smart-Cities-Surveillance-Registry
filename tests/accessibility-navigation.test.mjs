import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
test("keyboard skip navigation has a concrete focusable target", () => {
 const source=readFileSync("apps/web/app/layout.tsx","utf8");
 assert.match(source,/href="#main-content"/);
 assert.match(source,/id="main-content" tabIndex=\{-1\}/);
});
test("form control focus and reduced motion are supported", () => {
 const css=readFileSync("apps/web/app/globals.css","utf8");
 assert.match(css,/input:focus-visible/);
 assert.match(css,/textarea:focus-visible/);
 assert.match(css,/prefers-reduced-motion: reduce/);
});
