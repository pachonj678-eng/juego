import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { Explosion } from './Explosion.js';
import { TargetDummy } from './TargetDummy.js';

export class Grenade {
  public position: Vector2;
  public velocity: Vector2;
  public hitbox: AABB;
  public isAlive = true;
  public hasExploded = false;

  private rotation = 0;
  private fuseTimer = 1.1; // 1.1 segundos de fusible
  private readonly GRAVITY = 1100; // px/s^2
  private readonly RESTITUTION = 0.45; // Coeficiente de restitución (rebote)

  constructor(x: number, y: number, facing: 1 | -1) {
    this.position = new Vector2(x, y);
    // Vector parabólico inicial: arco ascendente hacia la dirección que mira el jugador
    this.velocity = new Vector2(facing * 280, -380);
    this.hitbox = new AABB(x - 6, y - 6, 12, 12);
  }

  public update(dt: number, groundY: number, enemies: TargetDummy[], onExplode: (exp: Explosion) => void): void {
    if (!this.isAlive || this.hasExploded) return;

    // Física de trayectoria parabólica
    this.velocity.y += this.GRAVITY * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    this.rotation += this.velocity.x * 0.05;
    this.hitbox.set(this.position.x - 6, this.position.y - 6, 12, 12);

    // Rebote elástico en el suelo
    if (this.position.y >= groundY - 4) {
      this.position.y = groundY - 4;
      this.velocity.y = -this.velocity.y * this.RESTITUTION;
      this.velocity.x *= 0.78; // Fricción contra el piso

      if (Math.abs(this.velocity.y) < 40) {
        this.velocity.y = 0; // Detiene el rebote vertical y rueda
      }
    }

    // Detonación por temporizador de fusible
    this.fuseTimer -= dt;
    if (this.fuseTimer <= 0) {
      this.detonate(enemies, onExplode);
      return;
    }

    // Detonación por impacto directo con cualquier enemigo
    for (const enemy of enemies) {
      if (enemy.isAlive && this.hitbox.intersects(enemy.hitbox)) {
        this.detonate(enemies, onExplode);
        return;
      }
    }
  }

  private detonate(enemies: TargetDummy[], onExplode: (exp: Explosion) => void): void {
    if (this.hasExploded) return;
    this.hasExploded = true;
    this.isAlive = false;

    // Crear explosión con daño en área (Splash Radius = 55px)
    const explosion = new Explosion(this.position.x, this.position.y, 55, 0.45, 30);
    onExplode(explosion);

    // Aplicar daño en área a todos los enemigos dentro del radio
    for (const enemy of enemies) {
      if (enemy.isAlive) {
        const dist = this.position.distanceTo(enemy.position);
        if (dist <= 55) {
          const impulse = enemy.position.x >= this.position.x ? 1 : -1;
          enemy.takeDamage('BULLET', impulse);
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    // Granada tipo piña militar Metal Slug (cuerpo verde oliva segmentado y percutor)
    ctx.fillStyle = '#3E562F';
    ctx.fillRect(-5, -6, 10, 12);

    // Ranuras cuadradas de fragmentación
    ctx.fillStyle = '#26391C';
    ctx.fillRect(-4, -4, 8, 2);
    ctx.fillRect(-4, 0, 8, 2);

    // Percutor y espoleta metálica
    ctx.fillStyle = '#A0A0A0';
    ctx.fillRect(-2, -9, 4, 3);
    ctx.fillStyle = '#E62429'; // Anilla roja indicadora
    ctx.beginPath();
    ctx.arc(3, -8, 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
