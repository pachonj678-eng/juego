/**
 * Vector2: Exact 2D mathematical vector utility for 60FPS physics and 8-directional aiming
 */
export class Vector2 {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  public set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  public clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  public copy(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  public add(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  public sub(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  public scale(n: number): this {
    this.x *= n;
    this.y *= n;
    return this;
  }

  public magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public normalize(): this {
    const mag = this.magnitude();
    if (mag > 0.00001) {
      this.x /= mag;
      this.y /= mag;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  public distanceTo(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  public equals(v: Vector2, tolerance = 0.0001): boolean {
    return Math.abs(this.x - v.x) <= tolerance && Math.abs(this.y - v.y) <= tolerance;
  }
}
