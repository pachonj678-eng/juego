import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { EnemyBullet } from './EnemyBullet.js';
import { EnemyGrenade } from './EnemyGrenade.js';
import { Explosion } from './Explosion.js';

export class RebelChopper {
  public position: Vector2;
  public velocity: Vector2 = new Vector2(0, 0);
  public hitbox: AABB;
  public isAlive = true;
  public health = 15;
  public maxHealth = 15;
  public facing: 1 | -1 = -1;

  // Hit Flash blanco
  public hitFlashTimer = 0;

  private baseY = 110; // Altura de vuelo aéreo
  private animTimer = 0;
  private attackTimer = 2.5;
  private deathTimer = 0;
  private rotorAngle = 0;

  constructor(x = 480, y = 110) {
    this.position = new Vector2(x, y);
    this.baseY = y;
    // Helicóptero ancho 50px, alto 34px
    this.hitbox = new AABB(x - 25, y - 20, 50, 34);
  }

  public takeDamage(amount = 1): void {
    if (!this.isAlive) return;

    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 0.08;

    if (this.health <= 0) {
      this.isAlive = false;
      this.deathTimer = 0;
      // Impulso de caída en picada girando
      this.velocity.set(this.facing * 140, 220);
    }
  }

  public respawn(x = 480, y = 110): void {
    this.position.set(x, y);
    this.baseY = y;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.hitFlashTimer = 0;
    this.attackTimer = 2.0;
    this.hitbox.set(x - 25, y - 20, 50, 34);
  }

  public update(
    dt: number,
    groundY: number,
    playerX: number,
    onShoot: (b: EnemyBullet) => void,
    onDropBomb: (g: EnemyGrenade) => void,
    onExplode: (exp: Explosion) => void
  ): void {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    this.animTimer += dt;
    this.rotorAngle += dt * 30; // Rotación rápida de palas

    if (!this.isAlive) {
      // Caída en barrena girando con humo hasta chocar contra el suelo
      this.deathTimer += dt;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;

      if (this.position.y >= groundY - 15) {
        onExplode(new Explosion(this.position.x, groundY - 15, 65, 0.5, 30));
        this.position.y = groundY + 100; // Desaparece tras la gran explosión
      }
      return;
    }

    this.facing = playerX <= this.position.x ? -1 : 1;

    // Vuelo sinusoidal aéreo con seguimiento suave del jugador
    const targetY = this.baseY + Math.sin(this.animTimer * 2.8) * 18;
    this.position.y = targetY;

    const dx = playerX - this.position.x;
    if (Math.abs(dx) > 120) {
      this.position.x += (dx > 0 ? 1 : -1) * 75 * dt;
    }

    this.hitbox.set(this.position.x - 25, this.position.y - 20, 50, 34);

    // Ataque Aéreo alternado (Bombas verticales o ráfagas diagonales)
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.attackTimer = 2.6;
      if (Math.random() < 0.5) {
        // Soltar bomba vertical
        onDropBomb(new EnemyGrenade(this.position.x, this.position.y + 12, playerX));
      } else {
        // Ráfaga diagonal de ametralladora hacia el jugador
        const dir = new Vector2(playerX - this.position.x, groundY - this.position.y).normalize();
        const bullet = new EnemyBullet(this.position.x + this.facing * 18, this.position.y + 10, dir.x, dir.y);
        bullet.speed = 280;
        onShoot(bullet);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.position.y > 400) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    if (!this.isAlive) {
      // Caída en barrena girando
      ctx.rotate(this.deathTimer * 8);
      ctx.fillStyle = '#222222';
      ctx.fillRect(-22, -14, 44, 24);
      ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
      ctx.beginPath();
      ctx.arc(-10, -10, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.scale(this.facing, 1);

    // Hit Flash blanco al recibir daño
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-25, -20, 50, 34);
      ctx.restore();
      return;
    }

    // 1. Aspas de rotor giratorias superiores
    ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
    ctx.fillRect(-32, -24, 64, 4);

    // Mástil de rotor
    ctx.fillStyle = '#222222';
    ctx.fillRect(-3, -20, 6, 6);

    // 2. Fuselaje helicóptero militar Rebelde "R-Shobu" (Verde oliva y gris)
    ctx.fillStyle = '#3E562F';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cola estabilizadora trasera
    ctx.fillStyle = '#26391C';
    ctx.fillRect(-28, -5, 14, 6);
    // Rotor de cola
    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.fillRect(-32, -12, 4, 18);

    // Cabina acristalada delantera
    ctx.fillStyle = '#78A1BB';
    ctx.beginPath();
    ctx.arc(12, -2, 8, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();

    // Patines de aterrizaje metálicos
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(-16, 14, 32, 3);
    ctx.fillRect(-10, 10, 4, 5);
    ctx.fillRect(8, 10, 4, 5);

    // Cañón ametrallador ventral
    ctx.fillStyle = '#E62429';
    ctx.fillRect(10, 6, 12, 4);

    // Barra de Vida Aérea Superior (15 HP)
    ctx.restore();
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    const hpPercent = this.health / this.maxHealth;
    ctx.fillStyle = '#222222';
    ctx.fillRect(-22, -32, 44, 5);
    ctx.fillStyle = hpPercent > 0.5 ? '#00E676' : (hpPercent > 0.25 ? '#FFD000' : '#E62429');
    ctx.fillRect(-21, -31, 42 * hpPercent, 3);

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFD000';
    ctx.textAlign = 'center';
    ctx.fillText(`R-SHOBU: ${this.health}/${this.maxHealth}`, 0, -38);

    ctx.restore();
  }
}
