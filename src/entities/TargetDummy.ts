import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { EnemyBullet } from './EnemyBullet.js';

export class TargetDummy {
  public position: Vector2;
  public velocity: Vector2 = new Vector2(0, 0);
  public hitbox: AABB;
  public isAlive = true;
  public deathTimer = 0;
  public deathReason: 'BULLET' | 'KNIFE' | null = null;
  public readonly isInfantry = true; // Identificador clave para el Melee Override
  public label: string;

  private initialX: number;
  private initialY: number;
  private shootTimer = 2.5; // Dispara cada 2.5s para probar esquivas y cancelación con escopeta

  constructor(x: number, y: number, label = 'SOLDADO (1 HP)') {
    this.initialX = x;
    this.initialY = y;
    this.label = label;
    this.position = new Vector2(x, y);
    this.hitbox = new AABB(x - 13, y - 48, 26, 48);
  }

  public respawn(): void {
    this.position.set(this.initialX, this.initialY);
    this.velocity.set(0, 0);
    this.hitbox.set(this.position.x - 13, this.position.y - 48, 26, 48);
    this.isAlive = true;
    this.deathTimer = 0;
    this.deathReason = null;
    this.shootTimer = 2.0;
  }

  public takeDamage(reason: 'BULLET' | 'KNIFE', impulseDir = 1): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.deathReason = reason;
    this.deathTimer = 0;

    // Física exagerada de muerte estilo Metal Slug (salir volando)
    if (reason === 'KNIFE') {
      this.velocity.set(impulseDir * 240, -320); // Impulso alto y letal
    } else {
      this.velocity.set(impulseDir * 180, -220);
    }
  }

  public update(dt: number, groundY: number, onShoot?: (bullet: EnemyBullet) => void): void {
    if (!this.isAlive) {
      this.deathTimer += dt;
      this.velocity.y += 980 * dt;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;

      if (this.position.y >= groundY) {
        this.position.y = groundY;
        this.velocity.x *= 0.85;
      }

      this.hitbox.set(this.position.x - 13, this.position.y - 48, 26, 48);
      return;
    }

    // Cadencia de disparo enemigo hacia la izquierda (hacia el jugador)
    if (onShoot) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 3.0; // Intervalo regular
        // Disparar a la altura del pecho del jugador (32px de altura sobre el suelo)
        const bullet = new EnemyBullet(this.position.x - 18, this.position.y - 32, -1, 0);
        onShoot(bullet);
      }
    }

    this.hitbox.set(this.position.x - 13, this.position.y - 48, 26, 48);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    if (this.isAlive) {
      // Soldado Rebelde clásico de Metal Slug
      ctx.fillStyle = '#4A6B3A'; // Casco militar
      ctx.fillRect(-10, -48, 20, 14);
      ctx.fillStyle = '#F5D0A9'; // Rostro
      ctx.fillRect(-8, -36, 16, 10);
      ctx.fillStyle = '#1A1A1A'; // Ojos
      ctx.fillRect(-6, -34, 3, 3);

      ctx.fillStyle = '#3E562F'; // Torso
      ctx.fillRect(-10, -26, 20, 14);
      ctx.fillStyle = '#61401B'; // Cartuchera
      ctx.fillRect(-10, -14, 20, 4);

      ctx.fillStyle = '#5A7545'; // Pantalones
      ctx.fillRect(-9, -10, 8, 10);
      ctx.fillRect(1, -10, 8, 10);

      ctx.fillStyle = '#222222'; // Botas
      ctx.fillRect(-10, 0, 9, 3);
      ctx.fillRect(1, 0, 9, 3);

      // Rifle apuntando a la izquierda
      ctx.fillStyle = '#2B2B2B';
      ctx.fillRect(-18, -25, 14, 4);
      ctx.fillRect(-20, -24, 4, 2);

      // Etiqueta indicadora
      ctx.fillStyle = '#E62429';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, -54);
    } else {
      ctx.rotate((this.deathTimer * 8) * (this.velocity.x > 0 ? 1 : -1));
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(-12, -24, 24, 12);
      ctx.fillStyle = '#3E562F';
      ctx.fillRect(-8, -12, 16, 10);

      if (this.deathReason === 'KNIFE') {
        ctx.fillStyle = '#FF3333';
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillText('¡SLASH!', 0, -20);
      }
    }

    ctx.restore();
  }
}
