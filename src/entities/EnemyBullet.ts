import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';

export class EnemyBullet {
  public position: Vector2;
  public velocity: Vector2;
  public hitbox: AABB;
  public isAlive = true;
  public isCancelled = false;
  public speed = 260;
  private lifetime = 4.0;

  constructor(x: number, y: number, dirX: number, dirY: number) {
    this.position = new Vector2(x, y);
    const dir = new Vector2(dirX, dirY).normalize();
    this.velocity = dir.scale(this.speed);
    this.hitbox = new AABB(x - 5, y - 5, 10, 10);
  }

  public cancel(): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.isCancelled = true;
  }

  public update(dt: number): void {
    if (!this.isAlive) return;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.hitbox.set(this.position.x - 5, this.position.y - 5, 10, 10);

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isAlive = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Proyectil enemigo clásico Metal Slug (esfera roja incandescente con núcleo amarillo)
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#E62429';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD000';
    ctx.fill();

    ctx.restore();
  }
}
