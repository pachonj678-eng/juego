import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { Explosion } from './Explosion.js';
import { TargetDummy } from './TargetDummy.js';

export class Rocket {
  public position: Vector2;
  public velocity: Vector2;
  public direction: Vector2;
  public hitbox: AABB;
  public isAlive = true;
  public damage = 12;

  // Mecánica canónica de aceleración progresiva
  private currentSpeed = 180;
  private readonly MAX_SPEED = 850;
  private readonly ACCELERATION = 750; // px/s^2

  // Partículas de estela de humo
  private smokeTrails: { x: number; y: number; radius: number; alpha: number }[] = [];

  constructor(x: number, y: number, dir: Vector2) {
    this.position = new Vector2(x, y);
    this.direction = dir.clone().normalize();
    this.velocity = this.direction.clone().scale(this.currentSpeed);
    this.hitbox = new AABB(x - 8, y - 8, 16, 16);
  }

  public update(dt: number, enemies: TargetDummy[], onExplode: (exp: Explosion) => void): void {
    if (!this.isAlive) return;

    // Aceleración progresiva
    if (this.currentSpeed < this.MAX_SPEED) {
      this.currentSpeed += this.ACCELERATION * dt;
      if (this.currentSpeed > this.MAX_SPEED) this.currentSpeed = this.MAX_SPEED;
      this.velocity = this.direction.clone().scale(this.currentSpeed);
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.hitbox.set(this.position.x - 8, this.position.y - 8, 16, 16);

    // Añadir partículas de humo a la estela
    this.smokeTrails.push({
      x: this.position.x - this.direction.x * 12,
      y: this.position.y - this.direction.y * 12,
      radius: 4,
      alpha: 0.8
    });

    // Actualizar estela
    for (let i = this.smokeTrails.length - 1; i >= 0; i--) {
      const s = this.smokeTrails[i];
      s.radius += dt * 8;
      s.alpha -= dt * 2.5;
      if (s.alpha <= 0) {
        this.smokeTrails.splice(i, 1);
      }
    }

    // Colisión con enemigos -> Impacto y Splash Damage en área
    for (const enemy of enemies) {
      if (enemy.isAlive && this.hitbox.intersects(enemy.hitbox)) {
        this.detonate(enemies, onExplode);
        return;
      }
    }

    // Fuera de pantalla
    if (this.position.x < -50 || this.position.x > 800 || this.position.y < -50 || this.position.y > 450) {
      this.isAlive = false;
    }
  }

  private detonate(enemies: TargetDummy[], onExplode: (exp: Explosion) => void): void {
    this.isAlive = false;

    // Explosión con daño en área (Splash Radius = 45px)
    const exp = new Explosion(this.position.x, this.position.y, 45, 0.35, this.damage);
    onExplode(exp);

    for (const enemy of enemies) {
      if (enemy.isAlive && this.position.distanceTo(enemy.position) <= 45) {
        const impulse = enemy.position.x >= this.position.x ? 1 : -1;
        enemy.takeDamage('BULLET', impulse);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. Renderizar estela de humo
    for (const s of this.smokeTrails) {
      ctx.fillStyle = `rgba(180, 180, 180, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    const angle = Math.atan2(this.direction.y, this.direction.x);
    ctx.rotate(angle);

    // Cohete icónico de Metal Slug (cabeza roja ojival, cuerpo cilíndrico gris, aletas traseras)
    // Fuego del propulsor trasero
    ctx.fillStyle = '#FFD000';
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-10, 3);
    ctx.fill();

    // Cuerpo
    ctx.fillStyle = '#7F8C8D';
    ctx.fillRect(-10, -4, 14, 8);

    // Ojiva roja
    ctx.fillStyle = '#E62429';
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.lineTo(12, 0);
    ctx.lineTo(4, 4);
    ctx.fill();

    // Aletas
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(-10, -6, 3, 12);

    ctx.restore();
  }
}
