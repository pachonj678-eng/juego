import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { InputManager } from '../engine/InputManager.js';
import { Bullet } from './Bullet.js';
import { SlugCannonShell } from './SlugCannonShell.js';
import { Explosion } from './Explosion.js';
import { TargetDummy } from './TargetDummy.js';
import { EnemyBullet } from './EnemyBullet.js';

export type SlugState = 'UNMANNED' | 'OCCUPIED' | 'SLUG_ATTACK' | 'DESTROYED';

export class VehicleSlug {
  public position: Vector2;
  public velocity: Vector2 = new Vector2(0, 0);
  public facing: 1 | -1 = 1;
  public isGrounded = true;

  // Hitbox y dimensiones del SV-001
  public hitbox: AABB;
  public static readonly WIDTH = 54;
  public static readonly STAND_HEIGHT = 42;
  public static readonly SQUAT_HEIGHT = 28; // Orugas agachadas

  // Constantes físicas del tanque
  public static readonly DRIVE_SPEED = 145; // Más pesado que el soldado a pie
  public static readonly JUMP_VELOCITY = -370;
  public static readonly GRAVITY = 1150;

  // Estado y Sistema de Salud de 3 Puntos
  public state: SlugState = 'UNMANNED';
  public health = 3;
  public maxHealth = 3;
  public cannonAmmo = 10;
  public isCrouched = false;

  // Torreta Vulcan con rotación independiente 360°
  public vulcanAngle = 0; // Radianes absolutos en el espacio
  public vulcanCooldown = 0;
  public cannonCooldown = 0;

  // Animaciones y efectos
  private treadAnim = 0;
  private smokeTimer = 0;
  private sirenFlashTimer = 0;
  private slugAttackTimer = 0;

  // Proyectiles propios del vehículo
  public vulcanBullets: Bullet[] = [];
  public cannonShells: SlugCannonShell[] = [];

  constructor(startX = 260, startY = 300) {
    this.position = new Vector2(startX, startY);
    this.hitbox = new AABB(
      startX - VehicleSlug.WIDTH * 0.5,
      startY - VehicleSlug.STAND_HEIGHT,
      VehicleSlug.WIDTH,
      VehicleSlug.STAND_HEIGHT
    );
  }

  public takeDamage(amount = 1): void {
    if (this.state === 'DESTROYED' || this.state === 'SLUG_ATTACK') return;

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.state = 'DESTROYED';
    }
  }

  public repair(): void {
    this.health = this.maxHealth;
    this.state = 'UNMANNED';
  }

  /**
   * Activación del legendario "Slug Attack" (Ataque Kamikaze)
   * Devuelve verdadero si se inició con éxito.
   */
  public triggerSlugAttack(): boolean {
    if (this.state !== 'OCCUPIED') return false;

    this.state = 'SLUG_ATTACK';
    this.slugAttackTimer = 0;
    // Turbo aceleración suicida hacia adelante
    this.velocity.x = this.facing * 580;
    this.velocity.y = 0;
    return true;
  }

  public update(
    dt: number,
    input: InputManager,
    groundY: number,
    enemies: TargetDummy[],
    enemyBullets: EnemyBullet[],
    onExplosion: (exp: Explosion) => void
  ): { playerEjected: boolean; ejectImpulse: Vector2 | null } {
    let playerEjected = false;
    let ejectImpulse: Vector2 | null = null;

    // 1. Control del tanque ocupado
    if (this.state === 'OCCUPIED') {
      const left = input.isDown('LEFT');
      const right = input.isDown('RIGHT');
      const up = input.isDown('UP');
      const down = input.isDown('DOWN');

      // Desmontar tanque: ABAJO + SALTO
      if (down && input.consumeBuffered('JUMP')) {
        this.state = 'UNMANNED';
        playerEjected = true;
        // El jugador salta hacia arriba y al frente
        ejectImpulse = new Vector2(this.facing * 120, -380);
      } else {
        // Encaramiento del chasis
        if (right && !left) this.facing = 1;
        if (left && !right) this.facing = -1;

        // Agacharse / Orugas bajan
        this.isCrouched = down && this.isGrounded && !left && !right;

        // Movimiento horizontal en tierra
        if (this.isGrounded) {
          if (!this.isCrouched) {
            if (right) {
              this.velocity.x = VehicleSlug.DRIVE_SPEED;
              this.treadAnim += dt * 15;
            } else if (left) {
              this.velocity.x = -VehicleSlug.DRIVE_SPEED;
              this.treadAnim -= dt * 15;
            } else {
              this.velocity.x = 0;
            }

            // Salto con suspensión pesada
            if (input.consumeBuffered('JUMP')) {
              this.velocity.y = VehicleSlug.JUMP_VELOCITY;
              this.isGrounded = false;
            }
          } else {
            this.velocity.x = 0;
          }
        } else {
          // Control aéreo
          if (right) this.velocity.x = VehicleSlug.DRIVE_SPEED;
          else if (left) this.velocity.x = -VehicleSlug.DRIVE_SPEED;
          else this.velocity.x = 0;

          this.velocity.y += VehicleSlug.GRAVITY * dt;
        }

        // 2. Apuntado de la torreta Vulcan (360° Independiente del chasis)
        let aimDx = 0;
        let aimDy = 0;
        if (right) aimDx = 1;
        if (left) aimDx = -1;
        if (up) aimDy = -1;
        if (down) aimDy = 1;

        if (aimDx !== 0 || aimDy !== 0) {
          this.vulcanAngle = Math.atan2(aimDy, aimDx);
        } else {
          // Apunta al frente por defecto
          this.vulcanAngle = this.facing === 1 ? 0 : Math.PI;
        }

        // 3. Disparo de Vulcan Cannons duales (Fuego rápido 0.07s)
        if (this.vulcanCooldown > 0) this.vulcanCooldown -= dt;
        if (input.isDown('FIRE') && this.vulcanCooldown <= 0) {
          this.vulcanCooldown = 0.07;
          this.fireVulcan();
        }

        // 4. Disparo de Cañón Principal (Obús parabólico)
        if (this.cannonCooldown > 0) this.cannonCooldown -= dt;
        if (input.consumeBuffered('GRENADE') && this.cannonAmmo > 0 && this.cannonCooldown <= 0) {
          this.cannonCooldown = 0.55;
          this.cannonAmmo--;
          const spawnX = this.position.x + this.facing * 32;
          const spawnY = this.position.y - 24;
          this.cannonShells.push(new SlugCannonShell(spawnX, spawnY, this.facing));
        }
      }
    } else if (this.state === 'SLUG_ATTACK') {
      // Mecánica Kamikaze: Turbo hacia adelante
      this.slugAttackTimer += dt;
      this.position.x += this.velocity.x * dt;
      this.treadAnim += dt * 45;

      // Colisión contra cualquier enemigo o pared -> Cataclismo
      for (const enemy of enemies) {
        if (enemy.isAlive && this.hitbox.intersects(enemy.hitbox)) {
          this.detonateKamikaze(enemies, onExplosion);
          return { playerEjected: false, ejectImpulse: null };
        }
      }

      // Detonación por límite de tiempo si no chocó
      if (this.slugAttackTimer >= 0.8) {
        this.detonateKamikaze(enemies, onExplosion);
        return { playerEjected: false, ejectImpulse: null };
      }
    } else if (this.state === 'UNMANNED') {
      // Gravedad si está en el aire
      if (!this.isGrounded) {
        this.velocity.y += VehicleSlug.GRAVITY * dt;
      }
      this.velocity.x = 0;
    }

    // Integración física de posición
    if (this.state !== 'SLUG_ATTACK') {
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;

      if (this.position.y >= groundY) {
        this.position.y = groundY;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    }

    // Actualizar Hitbox (Altura comprimida si está agachado)
    const currentH = this.isCrouched ? VehicleSlug.SQUAT_HEIGHT : VehicleSlug.STAND_HEIGHT;
    this.hitbox.set(
      this.position.x - VehicleSlug.WIDTH * 0.5,
      this.position.y - currentH,
      VehicleSlug.WIDTH,
      currentH
    );

    // Actualizar Proyectiles del Tanque
    for (let i = this.vulcanBullets.length - 1; i >= 0; i--) {
      const b = this.vulcanBullets[i];
      b.update(dt);
      if (!b.isAlive) {
        this.vulcanBullets.splice(i, 1);
        continue;
      }
      for (const enemy of enemies) {
        if (enemy.isAlive && b.hitbox.intersects(enemy.hitbox)) {
          b.isAlive = false;
          enemy.takeDamage('BULLET', b.direction.x > 0 ? 1 : -1);
          break;
        }
      }
    }

    for (let i = this.cannonShells.length - 1; i >= 0; i--) {
      const shell = this.cannonShells[i];
      shell.update(dt, groundY, enemies, onExplosion);
      if (!shell.isAlive) {
        this.cannonShells.splice(i, 1);
      }
    }

    // Temporizadores de humo y sirenas según daño (3 HP, 2 HP, 1 HP)
    this.smokeTimer += dt;
    this.sirenFlashTimer += dt * 8;

    return { playerEjected, ejectImpulse };
  }

  private fireVulcan(): void {
    const dir = new Vector2(Math.cos(this.vulcanAngle), Math.sin(this.vulcanAngle));
    // Disparo alternado de doble cañón Vulcan
    const spawnX = this.position.x + dir.x * 24;
    const spawnY = this.position.y - 28 + dir.y * 24;
    this.vulcanBullets.push(new Bullet(spawnX, spawnY, dir, 2));
  }

  private detonateKamikaze(enemies: TargetDummy[], onExplosion: (exp: Explosion) => void): void {
    this.state = 'DESTROYED';
    this.health = 0;

    // Explosión masiva devastadora (Radio 85px, Daño 150)
    const exp = new Explosion(this.position.x, this.position.y - 20, 85, 0.6, 150);
    onExplosion(exp);

    for (const enemy of enemies) {
      if (enemy.isAlive && this.position.distanceTo(enemy.position) <= 90) {
        enemy.takeDamage('KNIFE', this.facing); // Daño letal masivo
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. Proyectiles del tanque
    for (const b of this.vulcanBullets) b.render(ctx);
    for (const shell of this.cannonShells) shell.render(ctx);

    if (this.state === 'DESTROYED') {
      // Chatarra humeante
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.fillStyle = '#222222';
      ctx.fillRect(-24, -18, 48, 18);
      ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
      ctx.beginPath();
      ctx.arc(0, -25, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.scale(this.facing, 1);

    const squatOffset = this.isCrouched ? 12 : 0;

    // Efecto de parpadeo Kamikaze durante Slug Attack
    if (this.state === 'SLUG_ATTACK') {
      const flash = Math.floor(this.slugAttackTimer * 20) % 2 === 0;
      if (flash) {
        ctx.fillStyle = '#E62429';
      }
    }

    // 2. Chasis Principal SV-001 (Azul grisáceo militar Neo Geo)
    ctx.fillStyle = '#3A506B'; // Blindaje azul grisáceo
    ctx.fillRect(-24, -36 + squatOffset, 48, 22);

    // Borde de planchas de blindaje
    ctx.strokeStyle = '#1C2541';
    ctx.lineWidth = 2;
    ctx.strokeRect(-24, -36 + squatOffset, 48, 22);

    // Escotilla / Cabina de vidrio esférico
    ctx.fillStyle = '#E0FBFC';
    ctx.beginPath();
    ctx.arc(4, -36 + squatOffset, 11, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#3A506B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cañón de artillería frontal
    ctx.fillStyle = '#1C2541';
    ctx.fillRect(16, -26 + squatOffset, 16, 8);
    ctx.fillStyle = '#5BC0BE';
    ctx.fillRect(30, -28 + squatOffset, 4, 12);

    // 3. Torreta Vulcan 360° (Rotación desacoplada del chasis)
    ctx.save();
    ctx.translate(-4, -40 + squatOffset);
    // Orientar torreta según ángulo vulcan compensado con facing
    const localVulcanAngle = this.facing === 1 ? this.vulcanAngle : Math.PI - this.vulcanAngle;
    ctx.rotate(localVulcanAngle);

    // Doble cañón Vulcan
    ctx.fillStyle = '#1C2541';
    ctx.fillRect(0, -6, 20, 5);
    ctx.fillRect(0, 1, 20, 5);
    // Base de la torreta giratoria
    ctx.fillStyle = '#5BC0BE';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Orugas de Tanque con Ruedas Rodantes
    ctx.fillStyle = '#111111';
    ctx.fillRect(-26, -14, 52, 14);

    // Ruedas dentadas rodantes
    ctx.fillStyle = '#4B5563';
    for (let i = 0; i < 4; i++) {
      const wheelX = -18 + i * 12;
      ctx.beginPath();
      ctx.arc(wheelX, -7, 5, 0, Math.PI * 2);
      ctx.fill();
      // Remaches centrales
      ctx.fillStyle = '#D1D5DB';
      ctx.fillRect(wheelX - 1, -8, 2, 2);
      ctx.fillStyle = '#4B5563';
    }

    // 5. Daño Visual Progresivo (3 HP -> Humo / Fuego)
    if (this.health <= 2) {
      // 2 HP: Humo grisáceo saliendo del escape trasero
      ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
      ctx.beginPath();
      ctx.arc(-22, -38, 6 + Math.sin(this.smokeTimer * 10) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.health <= 1) {
      // 1 HP: Humo negro espeso, llamaradas y sirena roja de peligro
      ctx.fillStyle = 'rgba(30, 30, 30, 0.85)';
      ctx.beginPath();
      ctx.arc(-20, -42, 10, 0, Math.PI * 2);
      ctx.arc(-26, -46, 8, 0, Math.PI * 2);
      ctx.fill();

      // Llamas parpadeantes
      ctx.fillStyle = Math.sin(this.sirenFlashTimer) > 0 ? '#FFD000' : '#E62429';
      ctx.beginPath();
      ctx.moveTo(-20, -36);
      ctx.lineTo(-24, -46);
      ctx.lineTo(-16, -40);
      ctx.fill();

      // Sirena roja de alarma parpadeante
      ctx.fillStyle = '#E62429';
      ctx.beginPath();
      ctx.arc(0, -48 + squatOffset, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Indicador si está desocupado
    if (this.state === 'UNMANNED') {
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#00E676';
      ctx.textAlign = 'center';
      ctx.fillText('[IN: S+SALTO]', 0, -52);
    }

    ctx.restore();
  }
}
