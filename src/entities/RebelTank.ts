import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { EnemyBullet } from './EnemyBullet.js';
import { Explosion } from './Explosion.js';

export class RebelTank {
  public position: Vector2;
  public velocity: Vector2 = new Vector2(0, 0);
  public hitbox: AABB;
  public isAlive = true;
  public health = 20;
  public maxHealth = 20;
  public facing: 1 | -1 = -1;

  // Hit Flash blanco al recibir daño (Mecánica clave para enemigos pesados)
  public hitFlashTimer = 0;

  private shootTimer = 2.8;
  private animTimer = 0;
  private deathTimer = 0;

  constructor(x = 520, y = 300) {
    this.position = new Vector2(x, y);
    // Tanque pesado ancho 60px, alto 40px
    this.hitbox = new AABB(x - 30, y - 40, 60, 40);
  }

  public takeDamage(amount = 1): void {
    if (!this.isAlive) return;

    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 0.08; // 80ms de parpadeo blanco stark puro

    if (this.health <= 0) {
      this.isAlive = false;
      this.deathTimer = 0;
    }
  }

  public respawn(x = 520, y = 300): void {
    this.position.set(x, y);
    this.health = this.maxHealth;
    this.isAlive = true;
    this.hitFlashTimer = 0;
    this.shootTimer = 2.0;
    this.hitbox.set(x - 30, y - 40, 60, 40);
  }

  public update(
    dt: number,
    groundY: number,
    playerX: number,
    onShoot: (b: EnemyBullet) => void,
    onExplode: (exp: Explosion) => void
  ): void {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    if (!this.isAlive) {
      this.deathTimer += dt;
      // Secuencia de explosiones secundarias al morir
      if (this.deathTimer < 1.2 && Math.random() < 0.3) {
        const randX = this.position.x + (Math.random() - 0.5) * 40;
        const randY = this.position.y - 20 + (Math.random() - 0.5) * 20;
        onExplode(new Explosion(randX, randY, 35, 0.3, 0));
      }
      return;
    }

    this.animTimer += dt;
    this.facing = playerX <= this.position.x ? -1 : 1;

    // Avance lento del tanque pesado (40 px/s)
    const distToPlayer = Math.abs(playerX - this.position.x);
    if (distToPlayer > 180) {
      this.position.x += this.facing * 38 * dt;
    }

    this.hitbox.set(this.position.x - 30, this.position.y - 40, 60, 40);

    // Cadencia de disparo de proyectiles pesados
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 3.2;
      // Disparo de proyectil pesado a media altura (evadible saltando o agachándose)
      const spawnX = this.position.x + this.facing * 34;
      const spawnY = this.position.y - 26;
      const shell = new EnemyBullet(spawnX, spawnY, this.facing, 0);
      shell.speed = 220;
      onShoot(shell);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    if (!this.isAlive) {
      // Chatarra quemada humeante
      ctx.fillStyle = '#222222';
      ctx.fillRect(-26, -20, 52, 20);
      ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
      ctx.beginPath();
      ctx.arc(0, -25, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.scale(this.facing, 1);

    // MECÁNICA CLAVE: Hit Flash blanco brillante al recibir daño
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-28, -38, 56, 38);
      ctx.restore();
      return;
    }

    // 1. Chasis Verde Militar Rebelde ("Iron Iso")
    ctx.fillStyle = '#3E562F';
    ctx.fillRect(-26, -34, 52, 22);

    ctx.strokeStyle = '#26391C';
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -34, 52, 22);

    // Torreta con cúpula
    ctx.fillStyle = '#4A6B3A';
    ctx.fillRect(-14, -44, 28, 12);
    ctx.strokeRect(-14, -44, 28, 12);

    // Cañón pesado frontal largo
    ctx.fillStyle = '#1C2541';
    ctx.fillRect(12, -40, 26, 7);
    ctx.fillStyle = '#E62429'; // Boca del cañón
    ctx.fillRect(36, -41, 3, 9);

    // Orugas y ruedas
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(-28, -12, 56, 12);

    ctx.fillStyle = '#6B7280';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-18 + i * 12, -6, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Barra de Vida Superior (20 HP)
    ctx.restore();
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    const hpPercent = this.health / this.maxHealth;
    ctx.fillStyle = '#222222';
    ctx.fillRect(-25, -52, 50, 6);
    ctx.fillStyle = hpPercent > 0.5 ? '#00E676' : (hpPercent > 0.25 ? '#FFD000' : '#E62429');
    ctx.fillRect(-24, -51, 48 * hpPercent, 4);

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`IRON ISO: ${this.health}/${this.maxHealth}`, 0, -58);

    ctx.restore();
  }
}
