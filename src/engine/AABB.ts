import { Vector2 } from './Vector2.js';

/**
 * Axis-Aligned Bounding Box (AABB) for high-precision hitboxes and hurtboxes
 */
export class AABB {
  public x: number;
  public y: number;
  public width: number;
  public height: number;

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public get left(): number {
    return this.x;
  }

  public get right(): number {
    return this.x + this.width;
  }

  public get top(): number {
    return this.y;
  }

  public get bottom(): number {
    return this.y + this.height;
  }

  public get centerX(): number {
    return this.x + this.width * 0.5;
  }

  public get centerY(): number {
    return this.y + this.height * 0.5;
  }

  public set(x: number, y: number, width: number, height: number): this {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    return this;
  }

  public intersects(other: AABB): boolean {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }

  public containsPoint(p: Vector2): boolean {
    return p.x >= this.left && p.x <= this.right && p.y >= this.top && p.y <= this.bottom;
  }

  public clone(): AABB {
    return new AABB(this.x, this.y, this.width, this.height);
  }
}
