import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const css = readFileSync("apps/web/app/globals.css", "utf8");
function color(name) {
  const value = css.match(new RegExp(`--${name}: (#[a-f0-9]{6});`))?.[1];
  assert.ok(value, `missing ${name} color token`); return value;
}
function luminance(hex) {
  return [1, 3, 5].map((position) => parseInt(hex.slice(position, position + 2), 16) / 255)
    .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((left, right) => left - right);
  return (high + .05) / (low + .05);
}
test("configured search controls meet non-text contrast on their declared surfaces", () => {
  for (const background of [color("surface"), color("paper"), color("surface-soft")]) {
    assert.ok(contrast(color("control-border"), background) >= 3);
    assert.ok(contrast(color("muted"), background) >= 4.5);
  }
  assert.match(css, /\.search-query input,[\s\S]*?border-color: var\(--control-border\)/);
});
