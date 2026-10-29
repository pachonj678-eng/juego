import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { EnemyBullet } from './EnemyBullet.js';

export class ShotgunPellet {
  public position: Vector2;
  public velocity: Vector2;
  public direction: Vector2;
  public hitbox: AABB;
  public isAlive = true;
  public damage = 5;
  private distanceTraveled = 0;
  private readonly MAX_RANGE = 220; // Alcance corto/medio devastador

  constructor(x: number, y: number, dir: Vector2, speed = 820) {
    this.position = new Vector2(x, y);
    this.direction = dir.clone().normalize();
    this.velocity = this.direction.clone().scale(speed);
    this.hitbox = new AABB(x - 6, y - 6, 12, 12);
  }

  public update(dt: number, enemyBullets: EnemyBullet[]): void {
    if (!this.isAlive) return;

    const moveStep = this.velocity.magnitude() * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.distanceTraveled += moveStep;

    this.hitbox.set(this.position.x - 6, this.position.y - 6, 12, 12);

    // MECÁNICA CLAVE: La escopeta cancela y destruye proyectiles enemigos
    for (const eb of enemyBullets) {
      if (eb.isAlive && this.hitbox.intersects(eb.hitbox)) {
        eb.cancel(); // Proyectil enemigo destruido en el aire
      }
    }

    if (this.distanceTraveled >= this.MAX_RANGE) {
      this.isAlive = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    const angle = Math.atan2(this.direction.y, this.direction.x);
    ctx.rotate(angle);

    // Destello de perdigón de escopeta masiva (halo naranja y núcleo blanco brillante)
    ctx.fillStyle = '#FF6A00';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
