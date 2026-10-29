import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { WeaponPickup, PickupType } from './WeaponPickup.js';
import { ApiClient } from '../api/auth.js';

export type POWState = 'TIED' | 'RESCUED' | 'WALK_TO_PLAYER' | 'SALUTE' | 'DROP_ITEM' | 'ESCAPE';

export class POW {
  public position: Vector2;
  public velocity: Vector2 = new Vector2(0, 0);
  public hitbox: AABB;
  public state: POWState = 'TIED';
  public isAlive = true;
  public rewardType: PickupType;
  public name = 'HYAKUTARO';

  private animTimer = 0;
  private stateTimer = 0;
  private facing: 1 | -1 = 1;
  private hasDroppedItem = false;
  private thankYouTextTimer = 0;

  constructor(x: number, y: number, rewardType: PickupType = 'H') {
    this.position = new Vector2(x, y);
    this.rewardType = rewardType;
    // Caja para detectar disparos o cuchilladas que corten las cuerdas
    this.hitbox = new AABB(x - 14, y - 36, 28, 36);
  }

  public rescue(playerX: number, onSpawnPickup: (p: WeaponPickup) => void): void {
    if (this.state !== 'TIED') return;

    this.state = 'RESCUED';
    this.stateTimer = 0;
    this.thankYouTextTimer = 2.5;

    // Registrar rescate en base de datos SQLite real
    ApiClient.rescuePow(this.name, this.rewardType);
  }

  public update(
    dt: number,
    groundY: number,
    playerX: number,
    onSpawnPickup: (p: WeaponPickup) => void
  ): void {
    if (!this.isAlive) return;

    this.animTimer += dt;
    this.stateTimer += dt;

    if (this.thankYouTextTimer > 0) {
      this.thankYouTextTimer = Math.max(0, this.thankYouTextTimer - dt);
    }

    switch (this.state) {
      case 'TIED': {
        // Atado, esperando ser liberado
        this.velocity.set(0, 0);
        break;
      }
      case 'RESCUED': {
        // Cuerdas rotas, se pone de pie (0.4s)
        this.velocity.set(0, 0);
        if (this.stateTimer >= 0.4) {
          this.state = 'WALK_TO_PLAYER';
          this.stateTimer = 0;
        }
        break;
      }
      case 'WALK_TO_PLAYER': {
        // Camina hacia el jugador
        const dist = playerX - this.position.x;
        this.facing = dist >= 0 ? 1 : -1;

        if (Math.abs(dist) > 40) {
          this.velocity.x = this.facing * 120;
        } else {
          // Ha llegado cerca del jugador -> Hacer saludo militar
          this.velocity.x = 0;
          this.state = 'SALUTE';
          this.stateTimer = 0;
        }
        break;
      }
      case 'SALUTE': {
        // Saludo militar (1.0s)
        this.velocity.set(0, 0);
        if (this.stateTimer >= 0.8 && !this.hasDroppedItem) {
          this.hasDroppedItem = true;
          this.state = 'DROP_ITEM';
          this.stateTimer = 0;
          // Soltar la caja de arma o bombas
          onSpawnPickup(new WeaponPickup(this.position.x + this.facing * 20, groundY, this.rewardType));
        }
        break;
      }
      case 'DROP_ITEM': {
        if (this.stateTimer >= 0.5) {
          this.state = 'ESCAPE';
          this.stateTimer = 0;
          this.facing = -1; // Huye hacia la izquierda
        }
        break;
      }
      case 'ESCAPE': {
        // Corre a toda velocidad fuera de la pantalla
        this.velocity.x = this.facing * 220;
        if (this.position.x < -60 || this.position.x > 800) {
          this.isAlive = false;
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

    this.hitbox.set(this.position.x - 14, this.position.y - 36, 28, 36);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.scale(this.facing, 1);

    // Texto de agradecimiento icónico "THANK YOU!"
    if (this.thankYouTextTimer > 0) {
      ctx.save();
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = '#FFD000';
      ctx.textAlign = 'center';
      ctx.fillText('THANK YOU!', 0, -48);
      ctx.restore();
    }

    if (this.state === 'TIED') {
      // --- PRISIONERO ATADO CON CUERDAS ---
      // Pelo rubio largo y barba
      ctx.fillStyle = '#E5C158';
      ctx.fillRect(-8, -34, 16, 12);
      ctx.fillRect(-10, -22, 20, 8); // Barba tupida

      // Rostro
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-6, -30, 12, 10);
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(-4, -28, 2, 2);

      // Torso desnudo
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-8, -20, 16, 10);

      // Cuerdas marrones atando el torso
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-9, -18, 18, 3);
      ctx.fillRect(-9, -13, 18, 3);

      // Pantalones cortos rasgados
      ctx.fillStyle = '#5A7545';
      ctx.fillRect(-8, -10, 16, 8);

      // Pies descalzos
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-9, -2, 7, 3);
      ctx.fillRect(2, -2, 7, 3);

      // Etiqueta indicadora
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#FFD000';
      ctx.textAlign = 'center';
      ctx.fillText('POW (RESCATAR)', 0, -42);
    } else {
      // --- PRISIONERO LIBRE (CAMINANDO / SALUDANDO / ESCAPANDO) ---
      const bounce = this.state === 'WALK_TO_PLAYER' || this.state === 'ESCAPE'
        ? Math.sin(this.animTimer * 20) * 3
        : 0;

      // Pelo largo ondeando
      ctx.fillStyle = '#E5C158';
      ctx.fillRect(-8, -38 + bounce, 16, 12);
      ctx.fillRect(-10, -26 + bounce, 20, 8); // Barba
      // Pelo ondeando hacia atrás si corre
      if (this.state === 'ESCAPE') {
        ctx.fillRect(-18, -34 + bounce, 10, 6);
      }

      // Rostro
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-6, -34 + bounce, 12, 10);
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(1, -32 + bounce, 2, 2);

      // Torso
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-7, -24 + bounce, 14, 12);

      // Brazo: Saludo militar o braceo al correr
      if (this.state === 'SALUTE') {
        // Brazo derecho en saludo militar a la ceja
        ctx.fillStyle = '#F5D0A9';
        ctx.fillRect(4, -34 + bounce, 10, 4);
        ctx.fillRect(12, -32 + bounce, 4, 10);
      } else {
        ctx.fillStyle = '#F5D0A9';
        ctx.fillRect(-4, -20 + bounce, 8, 8);
      }

      // Pantalones rasgados
      ctx.fillStyle = '#5A7545';
      ctx.fillRect(-7, -12 + bounce, 14, 6);

      // Piernas y pies
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-6, -6, 5, 6);
      ctx.fillRect(1, -6, 5, 6);
    }

    ctx.restore();
  }
}
