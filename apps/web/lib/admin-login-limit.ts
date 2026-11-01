/** Per-process backstop; production ingress must enforce distributed limits. */
export class AdminLoginLimit {
  private windowStart = 0;
  private attempts = 0;
  private readonly maximum: number;
  private readonly windowMs: number;
  constructor(maximum = 30, windowMs = 60_000) {
    this.maximum = maximum;
    this.windowMs = windowMs;
  }
  consume(now = Date.now()): boolean {
    if (now < this.windowStart || now - this.windowStart >= this.windowMs) {
      this.windowStart = now;
      this.attempts = 0;
    }
    if (this.attempts >= this.maximum) return false;
    this.attempts += 1;
    return true;
  }
}
