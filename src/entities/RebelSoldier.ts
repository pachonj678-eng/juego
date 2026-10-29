import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { EnemyBullet } from './EnemyBullet.js';
import { EnemyGrenade } from './EnemyGrenade.js';

export type SoldierState =
  | 'DISTRACTED'
  | 'PATROL'
  | 'PANIC'
  | 'SHOOT_RIFLE'
  | 'THROW_GRENADE'
  | 'KNIFE_CHARGE'
  | 'DYING_AIRBORNE';

export class RebelSoldier {
  public position: Vector2;
  public velocity: Vector2 = new Vector2(0, 0);
  public hitbox: AABB;
  public isAlive = true;
  public readonly isInfantry = true; // Habilita el Melee Override del jugador
  public state: SoldierState = 'PATROL';
  public facing: 1 | -1 = -1;

  private startX: number;
  private patrolMinX: number;
  private patrolMaxX: number;
  private stateTimer = 0;
  private deathTimer = 0;
  private deathReason: string = 'BULLET';
  private animTimer = 0;

  constructor(x: number, y: number, patrolRange = 100) {
    this.startX = x;
    this.position = new Vector2(x, y);
    this.patrolMinX = x - patrolRange;
    this.patrolMaxX = x + patrolRange;
    this.hitbox = new AABB(x - 13, y - 48, 26, 48);

    // Estado inicial aleatorio
    const states: SoldierState[] = ['DISTRACTED', 'PATROL', 'SHOOT_RIFLE'];
    this.state = states[Math.floor(Math.random() * states.length)];
  }

  public takeDamage(reason: string, impulseDir = 1): void {
    if (!this.isAlive) return;

    this.isAlive = false;
    this.state = 'DYING_AIRBORNE';
    this.deathReason = reason;
    this.deathTimer = 0;

    // Física de salida volando exagerada estilo Metal Slug
    const forceY = reason === 'KNIFE' ? -380 : (reason === 'ROCKET' || reason === 'GRENADE' ? -420 : -280);
    const forceX = impulseDir * (reason === 'SHOTGUN' ? 340 : (reason === 'KNIFE' ? 260 : 190));
    this.velocity.set(forceX, forceY);
  }

  public respawn(x = this.startX, y = 300): void {
    this.position.set(x, y);
    this.velocity.set(0, 0);
    this.isAlive = true;
    this.state = 'PATROL';
    this.stateTimer = 0;
    this.deathTimer = 0;
    this.hitbox.set(x - 13, y - 48, 26, 48);
  }

  public update(
    dt: number,
    groundY: number,
    playerX: number,
    onShoot: (b: EnemyBullet) => void,
    onThrowGrenade: (g: EnemyGrenade) => void
  ): void {
    this.animTimer += dt;

    if (!this.isAlive) {
      // Física balística de muerte aérea exagerada
      this.deathTimer += dt;
      this.velocity.y += 980 * dt;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;

      if (this.position.y >= groundY) {
        this.position.y = groundY;
        this.velocity.x *= 0.82;
      }
      this.hitbox.set(this.position.x - 13, this.position.y - 48, 26, 48);
      return;
    }

    this.stateTimer += dt;
    const distToPlayer = Math.abs(playerX - this.position.x);
    this.facing = playerX <= this.position.x ? -1 : 1;

    // Árbol de Comportamiento / Máquina de Estados de IA
    switch (this.state) {
      case 'DISTRACTED': {
        // Distraído (riendo/comiendo). Si el jugador se acerca a <220px, entra en pánico
        this.velocity.x = 0;
        if (distToPlayer < 240) {
          this.state = 'PANIC';
          this.stateTimer = 0;
        } else if (this.stateTimer >= 3.5) {
          this.state = 'PATROL';
          this.stateTimer = 0;
        }
        break;
      }
      case 'PATROL': {
        // Patrullar hacia adelante y atrás
        this.velocity.x = this.facing * 50;
        if (this.position.x <= this.patrolMinX || this.position.x >= this.patrolMaxX) {
          this.facing = this.facing === 1 ? -1 : 1;
        }

        if (distToPlayer < 260) {
          // Elegir acción hostil aleatoria (Disparar, Granada o Carga de Cuchillo)
          const roll = Math.random();
          if (roll < 0.45) {
            this.state = 'SHOOT_RIFLE';
          } else if (roll < 0.75) {
            this.state = 'THROW_GRENADE';
          } else {
            this.state = 'KNIFE_CHARGE';
          }
          this.stateTimer = 0;
        }
        break;
      }
      case 'PANIC': {
        // Manos arriba y grito asustado estilo cómico Metal Slug (0.6s)
        this.velocity.x = -this.facing * 40;
        if (this.stateTimer >= 0.7) {
          this.state = 'SHOOT_RIFLE';
          this.stateTimer = 0;
        }
        break;
      }
      case 'SHOOT_RIFLE': {
        // Apuntar y disparar bala con rifle
        this.velocity.x = 0;
        if (this.stateTimer >= 0.5) {
          onShoot(new EnemyBullet(this.position.x + this.facing * 18, this.position.y - 30, this.facing, 0));
          this.state = 'PATROL';
          this.stateTimer = 0;
        }
        break;
      }
      case 'THROW_GRENADE': {
        // Sacar y lanzar granada de palo parabólica
        this.velocity.x = 0;
        if (this.stateTimer >= 0.6) {
          onThrowGrenade(new EnemyGrenade(this.position.x + this.facing * 12, this.position.y - 36, playerX));
          this.state = 'PATROL';
          this.stateTimer = 0;
        }
        break;
      }
      case 'KNIFE_CHARGE': {
        // Correr a toda velocidad hacia el jugador con bayoneta
        this.velocity.x = this.facing * 210;
        if (distToPlayer < 36 || this.stateTimer >= 2.0) {
          this.state = 'SHOOT_RIFLE';
          this.stateTimer = 0;
        }
        break;
      }
    }

    // Físicas
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    if (this.position.y >= groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
    }

    this.hitbox.set(this.position.x - 13, this.position.y - 48, 26, 48);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    if (!this.isAlive) {
      // Salir volando girando con física exagerada
      ctx.rotate(this.deathTimer * 9 * (this.velocity.x >= 0 ? 1 : -1));
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(-12, -24, 24, 12);
      ctx.fillStyle = '#3E562F';
      ctx.fillRect(-8, -12, 16, 10);
      if (this.deathReason === 'KNIFE') {
        ctx.fillStyle = '#FF3333';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('¡SLASH!', 0, -20);
      }
      ctx.restore();
      return;
    }

    ctx.scale(this.facing, 1);

    // --- SOLDADO REBELDE VIVO SEGÚN ESTADO DE IA ---
    // Casco y rostro
    ctx.fillStyle = '#4A6B3A'; // Casco militar
    ctx.fillRect(-10, -48, 20, 14);
    ctx.fillStyle = '#F5D0A9'; // Rostro
    ctx.fillRect(-8, -36, 16, 10);
    ctx.fillStyle = '#1A1A1A'; // Ojos
    ctx.fillRect(-6, -34, 3, 3);

    // Torso y chaqueta
    ctx.fillStyle = '#3E562F';
    ctx.fillRect(-10, -26, 20, 14);
    ctx.fillStyle = '#61401B';
    ctx.fillRect(-10, -14, 20, 4);

    // Pantalones militares
    ctx.fillStyle = '#5A7545';
    ctx.fillRect(-9, -10, 8, 10);
    ctx.fillRect(1, -10, 8, 10);

    // Botas
    ctx.fillStyle = '#222222';
    ctx.fillRect(-10, 0, 9, 3);
    ctx.fillRect(1, 0, 9, 3);

    // Renderizado según Estado de IA
    if (this.state === 'PANIC') {
      // Brazos levantados en pánico
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-12, -44, 4, 16);
      ctx.fillRect(8, -44, 4, 16);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('¡WAAAH!', -8, -54);
    } else if (this.state === 'KNIFE_CHARGE') {
      // Cuchillo extendido corriendo
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(6, -26, 12, 5);
      ctx.fillStyle = '#E8E8E8';
      ctx.fillRect(18, -28, 10, 4);
    } else if (this.state === 'THROW_GRENADE') {
      // Brazo levantado con granada de palo
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-4, -40, 6, 14);
      ctx.fillStyle = '#8B5A2B';
      ctx.fillRect(-2, -48, 4, 10);
      ctx.fillStyle = '#4A6B3A';
      ctx.fillRect(-4, -54, 8, 6);
    } else if (this.state === 'DISTRACTED') {
      // Comiendo un muslo de pollo
      ctx.fillStyle = '#D35400';
      ctx.fillRect(4, -32, 8, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(12, -30, 4, 2);
    } else {
      // Rifle estándar apuntando al frente
      ctx.fillStyle = '#2B2B2B';
      ctx.fillRect(4, -26, 18, 4);
      ctx.fillRect(18, -24, 4, 2);
    }

    ctx.restore();
  }
}
