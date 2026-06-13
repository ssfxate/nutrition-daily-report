import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHeadingValue } from "../src/settings-utils";

test("normalizeHeadingValue trims non-empty headings", () => {
  assert.equal(normalizeHeadingValue("  Food  "), "Food");
});

test("normalizeHeadingValue rejects empty headings", () => {
  assert.equal(normalizeHeadingValue("   "), null);
});
