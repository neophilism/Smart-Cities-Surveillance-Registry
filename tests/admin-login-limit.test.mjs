import assert from "node:assert/strict";
import test from "node:test";
import { AdminLoginLimit } from "../apps/web/lib/admin-login-limit.ts";
test("login backstop limits bursts and recovers at the window boundary", () => {
  const limiter = new AdminLoginLimit(2, 60000);
  assert.equal(limiter.consume(100000), true);
  assert.equal(limiter.consume(100001), true);
  assert.equal(limiter.consume(159999), false);
  assert.equal(limiter.consume(160000), true);
  assert.equal(limiter.consume(160001), true);
  assert.equal(limiter.consume(160002), false);
});
test("clock rollback starts a new bounded window", () => {
  const limiter = new AdminLoginLimit(1, 60000);
  assert.equal(limiter.consume(100000), true);
  assert.equal(limiter.consume(100001), false);
  assert.equal(limiter.consume(90000), true);
  assert.equal(limiter.consume(90001), false);
});
