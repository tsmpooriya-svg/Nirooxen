import assert from "node:assert/strict";
import test from "node:test";

import { imageBackdrop } from "../src/lib/media/backdrop-value.ts";

test("preserves every supported image backdrop", () => {
  assert.equal(imageBackdrop("cut"), "cut");
  assert.equal(imageBackdrop("light"), "light");
  assert.equal(imageBackdrop("dark"), "dark");
});

test("rejects client-made or missing backdrop values", () => {
  assert.equal(imageBackdrop("transparent"), null);
  assert.equal(imageBackdrop("LIGHT"), null);
  assert.equal(imageBackdrop(undefined), null);
  assert.equal(imageBackdrop(null), null);
});
