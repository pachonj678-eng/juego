import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { Explosion } from './Explosion.js';
import { TargetDummy } from './TargetDummy.js';

export class SlugCannonShell {
  public position: Vector2;
  public velocity: Vector2;
  public hitbox: AABB;
  public isAlive = true;
  private readonly GRAVITY = 850; // Trayectoria balística pesada
  public damage = 40;

  constructor(x: number, y: number, facing: 1 | -1) {
    this.position = new Vector2(x, y);
    // Cañón principal del SV-001 disparado en arco balístico
    this.velocity = new Vector2(facing * 420, -260);
    this.hitbox = new AABB(x - 8, y - 8, 16, 16);
  }

  public update(dt: number, groundY: number, enemies: TargetDummy[], onExplode: (exp: Explosion) => void): void {
    if (!this.isAlive) return;

    this.velocity.y += this.GRAVITY * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.hitbox.set(this.position.x - 8, this.position.y - 8, 16, 16);

    // Impacto con el suelo -> Gran detonación de cañón
    if (this.position.y >= groundY - 4) {
      this.detonate(enemies, onExplode);
      return;
    }

    // Impacto directo con enemigo
    for (const enemy of enemies) {
      if (enemy.isAlive && this.hitbox.intersects(enemy.hitbox)) {
        this.detonate(enemies, onExplode);
        return;
      }
    }
  }

  private detonate(enemies: TargetDummy[], onExplode: (exp: Explosion) => void): void {
    this.isAlive = false;

    // Explosión masiva de artillería de tanque (Radio 65px, Daño 40)
    const exp = new Explosion(this.position.x, this.position.y, 65, 0.45, this.damage);
    onExplode(exp);

    for (const enemy of enemies) {
      if (enemy.isAlive && this.position.distanceTo(enemy.position) <= 65) {
        const impulse = enemy.position.x >= this.position.x ? 1 : -1;
        enemy.takeDamage('BULLET', impulse * 1.5);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    ctx.rotate(angle);

    // Obús pesado de cañón SV-001 (ojiva dorada con estela ígnea)
    ctx.fillStyle = '#FFD000';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-4, -2, 6, 4);

    ctx.restore();
  }
}
