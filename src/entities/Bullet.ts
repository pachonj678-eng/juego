import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';

export class Bullet {
  public position: Vector2;
  public velocity: Vector2;
  public direction: Vector2;
  public hitbox: AABB;
  public isAlive = true;
  public damage = 1;
  public speed = 700;
  private lifeTime = 1.5; // Segundos antes de auto-destruirse

  constructor(x: number, y: number, dir: Vector2, damage = 1) {
    this.position = new Vector2(x, y);
    this.direction = dir.clone().normalize();
    this.velocity = this.direction.clone().scale(this.speed);
    this.damage = damage;
    this.hitbox = new AABB(x - 4, y - 4, 8, 8);
  }

  public update(dt: number): void {
    if (!this.isAlive) return;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    this.hitbox.set(this.position.x - 4, this.position.y - 4, 8, 8);

    this.lifeTime -= dt;
    if (this.lifeTime <= 0) {
      this.isAlive = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    const angle = Math.atan2(this.direction.y, this.direction.x);
    ctx.rotate(angle);

    // Trazador bala clásica Metal Slug (núcleo blanco, halo amarillo-naranja)
    ctx.fillStyle = '#FFD000';
    ctx.fillRect(-6, -2, 12, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-3, -1, 7, 2);

    ctx.restore();
  }
}
