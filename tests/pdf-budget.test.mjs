import assert from "node:assert/strict";
import test from "node:test";
import { assertPdfBudget, PDF_MAX_BYTES, PDF_MAX_PAGES, PDF_MAX_TEXT_CHARACTERS } from "../packages/documents/src/pdf-budget.ts";
test("PDF extraction budgets accept boundaries and reject oversized resource demands", () => {
  assert.doesNotThrow(() => assertPdfBudget(PDF_MAX_BYTES, PDF_MAX_PAGES, PDF_MAX_TEXT_CHARACTERS));
  assert.throws(() => assertPdfBudget(PDF_MAX_BYTES + 1), /25 MiB/);
  assert.throws(() => assertPdfBudget(100, PDF_MAX_PAGES + 1), /500-page/);
  assert.throws(() => assertPdfBudget(100, 1, PDF_MAX_TEXT_CHARACTERS + 1), /text limit/);
  for (const value of [NaN, Infinity, -1, 1.5]) assert.throws(() => assertPdfBudget(100, value), /counts are invalid/);
});
