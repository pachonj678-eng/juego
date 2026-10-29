import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { InputManager } from '../engine/InputManager.js';
import { PlayerFSM } from './PlayerFSM.js';
import { Bullet } from './Bullet.js';
import { Rocket } from './Rocket.js';
import { ShotgunPellet } from './ShotgunPellet.js';
import { Grenade } from './Grenade.js';
import { Explosion } from './Explosion.js';
import { TargetDummy } from './TargetDummy.js';
import { EnemyBullet } from './EnemyBullet.js';
import { WeaponPickup } from './WeaponPickup.js';

export type WeaponType = 'PISTOL' | 'HMG' | 'ROCKET' | 'SHOTGUN';

export class Player {
  // Posición y física (sub-píxeles deterministas a 60 FPS)
  public position: Vector2;
  public velocity: Vector2 = new Vector2(0, 0);
  public facing: 1 | -1 = 1; // 1 = Derecha, -1 = Izquierda
  public isGrounded = true;

  // Cajas de colisión (Hitbox y Hurtbox)
  public hitbox: AABB;
  public meleeRangeBox: AABB;

  // Dimensiones canónicas de Metal Slug (reducción 50% al agacharse)
  public static readonly STAND_WIDTH = 26;
  public static readonly STAND_HEIGHT = 48;
  public static readonly CROUCH_HEIGHT = 24; // 50% de la altura normal
  public static readonly MELEE_DISTANCE_THRESHOLD = 52; // Píxeles de proximidad

  // Constantes Físicas canónicas Run-and-Gun
  public static readonly WALK_SPEED = 200;
  public static readonly JUMP_VELOCITY = -460;
  public static readonly GRAVITY = 1150;

  // Sistema de Estados Finita (FSM)
  public fsm: PlayerFSM;

  // Vector de apuntado en 8 direcciones
  public aimDirection: Vector2 = new Vector2(1, 0);

  // Sistema de I-Frames (Invulnerabilidad tras reaparición)
  public iFrameTimer = 0;
  public static readonly DEFAULT_IFRAME_DURATION = 2.5; // 2.5 segundos de gracia

  // Cadencia y temporizadores de combate
  public fireCooldown = 0;
  public meleeTimer = 0;
  public static readonly MELEE_DURATION = 0.22; // Duración de la animación del acuchillado

  // SISTEMA DE ARMAS DE FASE 2
  public currentWeapon: WeaponType = 'PISTOL';
  public ammo: number = Infinity;
  public grenades = 10;
  public score = 0;
  public lives = 3;

  // Anuncio visual de recogida de arma (ej. "HEAVY MACHINE GUN!")
  public weaponAnnouncement = '';
  public announcementTimer = 0;

  // Proyectiles y entidades activas del sistema de combate
  public bullets: Bullet[] = [];
  public rockets: Rocket[] = [];
  public pellets: ShotgunPellet[] = [];
  public grenadesList: Grenade[] = [];
  public explosions: Explosion[] = [];

  constructor(startX = 100, startY = 300) {
    this.position = new Vector2(startX, startY);
    this.hitbox = new AABB(
      startX - Player.STAND_WIDTH * 0.5,
      startY - Player.STAND_HEIGHT,
      Player.STAND_WIDTH,
      Player.STAND_HEIGHT
    );
    this.meleeRangeBox = new AABB(0, 0, Player.MELEE_DISTANCE_THRESHOLD, Player.STAND_HEIGHT);

    this.fsm = new PlayerFSM();
    this.initFSM();

    // Iniciar con I-Frames de reaparición inicial
    this.grantIFrames(Player.DEFAULT_IFRAME_DURATION);
  }

  private initFSM(): void {
    // 1. IDLE (De pie, respirando)
    this.fsm.registerState('IDLE', {
      onEnter: () => {
        this.velocity.x = 0;
      },
      onUpdate: () => {
        this.updateAimDirection(false);
      },
    });

    // 2. RUN (Corriendo)
    this.fsm.registerState('RUN', {
      onUpdate: () => {
        this.updateAimDirection(false);
      },
    });

    // 3. JUMP (Ascenso en el aire)
    this.fsm.registerState('JUMP', {
      onUpdate: () => {
        this.updateAimDirection(true); // En el aire: 8 direcciones completas
      },
    });

    // 4. FALL (Descenso por gravedad)
    this.fsm.registerState('FALL', {
      onUpdate: () => {
        this.updateAimDirection(true); // En el aire: 8 direcciones completas
      },
    });

    // 5. CROUCH (Agachado: hitbox reducido al 50%, solo disparo horizontal)
    this.fsm.registerState('CROUCH', {
      onEnter: () => {
        this.velocity.x = 0;
        this.aimDirection.set(this.facing, 0); // Solo disparo horizontal
      },
      onUpdate: () => {
        this.aimDirection.set(this.facing, 0);
      },
    });

    // 6. MELEE (Cuchillo: ataque letal cancela disparo si enemigo está cerca)
    this.fsm.registerState('MELEE', {
      onEnter: () => {
        this.meleeTimer = Player.MELEE_DURATION;
      },
      onUpdate: (dt) => {
        this.meleeTimer -= dt;
        if (this.meleeTimer <= 0) {
          if (!this.isGrounded) {
            this.fsm.setState(this.velocity.y < 0 ? 'JUMP' : 'FALL');
          } else if (this.currentDownInput) {
            this.fsm.setState('CROUCH');
          } else if (Math.abs(this.velocity.x) > 10) {
            this.fsm.setState('RUN');
          } else {
            this.fsm.setState('IDLE');
          }
        }
      },
    });

    // 7. SHOOT (Disparo con cadencia dependiente del arma)
    this.fsm.registerState('SHOOT', {
      onUpdate: (dt) => {
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0) {
          if (!this.isGrounded) {
            this.fsm.setState(this.velocity.y < 0 ? 'JUMP' : 'FALL');
          } else if (this.currentDownInput) {
            this.fsm.setState('CROUCH');
          } else if (Math.abs(this.velocity.x) > 10) {
            this.fsm.setState('RUN');
          } else {
            this.fsm.setState('IDLE');
          }
        }
      },
    });

    // 8. IN_VEHICLE (Montado dentro del tanque SV-001)
    this.fsm.registerState('IN_VEHICLE', {
      onEnter: () => {
        this.velocity.set(0, 0);
      },
    });
  }

  // Inputs en caché del frame
  private currentUpInput = false;
  private currentDownInput = false;
  private currentLeftInput = false;
  private currentRightInput = false;

  private updateAimDirection(allowDownwards: boolean): void {
    let dx = 0;
    let dy = 0;

    if (this.currentRightInput) dx = 1;
    if (this.currentLeftInput) dx = -1;
    if (this.currentUpInput) dy = -1; // -1 en canvas es arriba

    if (allowDownwards && this.currentDownInput) {
      dy = 1; // 1 en canvas es abajo
    }

    if (dx !== 0 && dy === 0) {
      this.aimDirection.set(dx, 0);
    } else if (dx === 0 && dy !== 0) {
      this.aimDirection.set(0, dy);
    } else if (dx !== 0 && dy !== 0) {
      this.aimDirection.set(dx, dy).normalize();
    } else {
      this.aimDirection.set(this.facing, 0);
    }
  }

  public grantIFrames(seconds: number): void {
    this.iFrameTimer = seconds;
  }

  public isInvulnerable(): boolean {
    return this.iFrameTimer > 0;
  }

  /**
   * Recoger un arma especial o munición
   */
  public equipWeapon(type: WeaponType, ammo: number): void {
    this.currentWeapon = type;
    this.ammo = ammo;
    this.weaponAnnouncement = `${this.getWeaponName(type).toUpperCase()}!`;
    this.announcementTimer = 2.0;
  }

  public getWeaponName(w: WeaponType): string {
    switch (w) {
      case 'HMG': return 'Heavy Machine Gun';
      case 'ROCKET': return 'Rocket Launcher';
      case 'SHOTGUN': return 'Shotgun';
      default: return 'Pistol';
    }
  }

  public mountVehicle(slugX: number, slugY: number): void {
    this.fsm.setState('IN_VEHICLE');
    this.position.set(slugX, slugY);
    this.velocity.set(0, 0);
    this.grantIFrames(1.5);
  }

  public dismountVehicle(x: number, y: number, impulse: Vector2): void {
    this.position.set(x, y);
    this.velocity.copy(impulse);
    this.isGrounded = false;
    this.grantIFrames(2.5);
    this.fsm.setState('JUMP');
  }

  /**
   * Actualización principal del Player Controller y Combate
   */
  public update(
    dt: number,
    input: InputManager,
    groundY: number,
    enemies: TargetDummy[],
    enemyBullets: EnemyBullet[],
    pickups: WeaponPickup[]
  ): void {
    // 1. Temporizadores
    if (this.iFrameTimer > 0) {
      this.iFrameTimer = Math.max(0, this.iFrameTimer - dt);
    }

    if (this.announcementTimer > 0) {
      this.announcementTimer = Math.max(0, this.announcementTimer - dt);
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    }

    // Si está montado dentro del SV-001, el vehículo asume el control
    if (this.fsm.getState() === 'IN_VEHICLE') {
      this.updateProjectiles(dt, groundY, enemies, enemyBullets);
      return;
    }

    // 2. Capturar inputs
    this.currentLeftInput = input.isDown('LEFT');
    this.currentRightInput = input.isDown('RIGHT');
    this.currentUpInput = input.isDown('UP');
    this.currentDownInput = input.isDown('DOWN');

    if (this.fsm.getState() !== 'MELEE') {
      if (this.currentRightInput && !this.currentLeftInput) this.facing = 1;
      if (this.currentLeftInput && !this.currentRightInput) this.facing = -1;
    }

    // 3. Manejo de Locomoción según estado
    const isCrouched = this.fsm.isCrouched();

    if (this.isGrounded) {
      if (this.currentDownInput && !this.fsm.isAttacking()) {
        this.fsm.setState('CROUCH');
      } else if (!this.currentDownInput && isCrouched && !this.fsm.isAttacking()) {
        this.fsm.setState('IDLE');
      }

      if (!isCrouched && this.fsm.getState() !== 'MELEE') {
        if (this.currentRightInput) {
          this.velocity.x = Player.WALK_SPEED;
          if (!this.fsm.isAttacking()) this.fsm.setState('RUN');
        } else if (this.currentLeftInput) {
          this.velocity.x = -Player.WALK_SPEED;
          if (!this.fsm.isAttacking()) this.fsm.setState('RUN');
        } else {
          this.velocity.x = 0;
          if (!this.fsm.isAttacking() && this.fsm.getState() !== 'CROUCH') {
            this.fsm.setState('IDLE');
          }
        }
      } else {
        this.velocity.x = 0;
      }

      if (input.consumeBuffered('JUMP') && !this.fsm.isAttacking()) {
        this.velocity.y = Player.JUMP_VELOCITY;
        this.isGrounded = false;
        this.fsm.setState('JUMP');
      }
    } else {
      if (this.currentRightInput) {
        this.velocity.x = Player.WALK_SPEED;
      } else if (this.currentLeftInput) {
        this.velocity.x = -Player.WALK_SPEED;
      } else {
        this.velocity.x = 0;
      }

      this.velocity.y += Player.GRAVITY * dt;

      if (!this.fsm.isAttacking()) {
        this.fsm.setState(this.velocity.y < 0 ? 'JUMP' : 'FALL');
      }
    }

    // 4. Integración física
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    if (this.position.y >= groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
      if (!this.isGrounded) {
        this.isGrounded = true;
        if (!this.fsm.isAttacking()) {
          this.fsm.setState(this.currentDownInput ? 'CROUCH' : (this.velocity.x !== 0 ? 'RUN' : 'IDLE'));
        }
      }
    }

    // 5. Hitbox Dinámico (Reducción 50% al agacharse)
    const currentHeight = this.fsm.isCrouched() ? Player.CROUCH_HEIGHT : Player.STAND_HEIGHT;
    this.hitbox.set(
      this.position.x - Player.STAND_WIDTH * 0.5,
      this.position.y - currentHeight,
      Player.STAND_WIDTH,
      currentHeight
    );

    // Sensor de proximidad frontal para el Melee Override
    const meleeX = this.facing === 1 ? this.position.x : this.position.x - Player.MELEE_DISTANCE_THRESHOLD;
    this.meleeRangeBox.set(
      meleeX,
      this.position.y - Player.STAND_HEIGHT,
      Player.MELEE_DISTANCE_THRESHOLD,
      Player.STAND_HEIGHT
    );

    // 6. Recolección de Pickups de Armas y Granadas
    for (const pickup of pickups) {
      if (pickup.isAlive && this.hitbox.intersects(pickup.hitbox)) {
        pickup.isAlive = false;
        if (pickup.type === 'H') {
          this.equipWeapon('HMG', 200);
        } else if (pickup.type === 'R') {
          this.equipWeapon('ROCKET', 30);
        } else if (pickup.type === 'S') {
          this.equipWeapon('SHOTGUN', 30);
        } else if (pickup.type === 'BOMB') {
          this.grenades += 10;
          this.weaponAnnouncement = '+10 BOMBS!';
          this.announcementTimer = 1.5;
        }
        this.score += 1000;
      }
    }

    // 7. Lanzamiento de Granadas Parabólicas (KeyL / KeyC)
    if (input.consumeBuffered('GRENADE') && this.grenades > 0) {
      this.throwGrenade();
    }

    // 8. Sistema de Disparo: Fuego Automático (HMG) vs Semiautomático con Melee Override
    const wantsToFire = this.currentWeapon === 'HMG'
      ? input.isDown('FIRE')
      : input.consumeBuffered('FIRE');

    if (wantsToFire && this.fsm.getState() !== 'MELEE' && this.fireCooldown <= 0) {
      this.handleFireAction(enemies);
    }

    // 9. Actualizar la FSM
    this.fsm.update(dt);

    // 10. Actualizar Proyectiles Activos
    this.updateProjectiles(dt, groundY, enemies, enemyBullets);
  }

  private handleFireAction(enemies: TargetDummy[]): void {
    // Verificar Melee Override frontal
    let targetInMeleeRange: TargetDummy | null = null;
    for (const enemy of enemies) {
      if (enemy.isAlive && enemy.isInfantry && this.meleeRangeBox.intersects(enemy.hitbox)) {
        targetInMeleeRange = enemy;
        break;
      }
    }

    if (targetInMeleeRange) {
      // MELEE OVERRIDE: Cuchillo instantáneo, sin consumo de munición
      this.fsm.setState('MELEE');
      targetInMeleeRange.takeDamage('KNIFE', this.facing);
      this.score += 500;
      return;
    }

    // Disparo con el arma equipada
    this.fsm.setState('SHOOT');
    this.fireCurrentWeapon();
  }

  private fireCurrentWeapon(): void {
    const spawnX = this.position.x + this.aimDirection.x * 22;
    const currentHeight = this.fsm.isCrouched() ? Player.CROUCH_HEIGHT * 0.6 : Player.STAND_HEIGHT * 0.6;
    const spawnY = (this.position.y - currentHeight) + this.aimDirection.y * 14;

    switch (this.currentWeapon) {
      case 'HMG': {
        // Heavy Machine Gun: fuego continuo con barrido angular (0.08s)
        this.fireCooldown = 0.08;
        this.bullets.push(new Bullet(spawnX, spawnY, this.aimDirection, 2));
        this.consumeAmmo(1);
        break;
      }
      case 'ROCKET': {
        // Rocket Launcher: proyectil autopropulsado con aceleración y splash (0.35s)
        this.fireCooldown = 0.35;
        this.rockets.push(new Rocket(spawnX, spawnY, this.aimDirection));
        this.consumeAmmo(1);
        break;
      }
      case 'SHOTGUN': {
        // Shotgun: cono de 6 perdigones devastadores que anulan balas enemigas (0.45s)
        this.fireCooldown = 0.45;
        const baseAngle = Math.atan2(this.aimDirection.y, this.aimDirection.x);
        const spreadCount = 6;
        const spreadArc = 0.35; // ~20 grados de apertura del cono

        for (let i = 0; i < spreadCount; i++) {
          const offset = ((i / (spreadCount - 1)) - 0.5) * spreadArc;
          const pelletAngle = baseAngle + offset;
          const pelletDir = new Vector2(Math.cos(pelletAngle), Math.sin(pelletAngle));
          this.pellets.push(new ShotgunPellet(spawnX, spawnY, pelletDir));
        }
        this.consumeAmmo(1);
        break;
      }
      case 'PISTOL':
      default: {
        // Pistola semiautomática (munición infinita)
        this.fireCooldown = 0.16;
        this.bullets.push(new Bullet(spawnX, spawnY, this.aimDirection, 1));
        break;
      }
    }
  }

  private consumeAmmo(amount: number): void {
    if (this.currentWeapon === 'PISTOL') return;

    this.ammo -= amount;
    if (this.ammo <= 0) {
      this.ammo = Infinity;
      this.currentWeapon = 'PISTOL';
      this.weaponAnnouncement = 'OUT OF AMMO!';
      this.announcementTimer = 1.5;
    }
  }

  private throwGrenade(): void {
    this.grenades--;
    const currentHeight = this.fsm.isCrouched() ? Player.CROUCH_HEIGHT * 0.8 : Player.STAND_HEIGHT * 0.8;
    const g = new Grenade(this.position.x + this.facing * 14, this.position.y - currentHeight, this.facing);
    this.grenadesList.push(g);
  }

  private updateProjectiles(
    dt: number,
    groundY: number,
    enemies: TargetDummy[],
    enemyBullets: EnemyBullet[]
  ): void {
    const onExplosion = (exp: Explosion) => {
      this.explosions.push(exp);
    };

    // 1. Balas (Pistola y HMG)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (!b.isAlive) {
        this.bullets.splice(i, 1);
        continue;
      }
      // Colisión con enemigos
      for (const enemy of enemies) {
        if (enemy.isAlive && b.hitbox.intersects(enemy.hitbox)) {
          b.isAlive = false;
          enemy.takeDamage('BULLET', b.direction.x > 0 ? 1 : -1);
          this.score += 100;
          break;
        }
      }
    }

    // 2. Cohetes (Rocket Launcher)
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.update(dt, enemies, onExplosion);
      if (!r.isAlive) {
        this.rockets.splice(i, 1);
      }
    }

    // 3. Perdigones de Escopeta (Shotgun)
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];
      p.update(dt, enemyBullets); // Anula proyectiles enemigos en el camino
      if (!p.isAlive) {
        this.pellets.splice(i, 1);
        continue;
      }
      // Colisión con enemigos
      for (const enemy of enemies) {
        if (enemy.isAlive && p.hitbox.intersects(enemy.hitbox)) {
          p.isAlive = false;
          enemy.takeDamage('BULLET', p.direction.x > 0 ? 1 : -1);
          this.score += 200;
          break;
        }
      }
    }

    // 4. Granadas Parabólicas
    for (let i = this.grenadesList.length - 1; i >= 0; i--) {
      const g = this.grenadesList[i];
      g.update(dt, groundY, enemies, onExplosion);
      if (!g.isAlive) {
        this.grenadesList.splice(i, 1);
      }
    }

    // 5. Explosiones activas
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.update(dt);
      if (!exp.isAlive) {
        this.explosions.splice(i, 1);
      }
    }
  }

  /**
   * Renderizado canónico del Player y todos sus proyectiles
   */
  public render(ctx: CanvasRenderingContext2D): void {
    // 1. Proyectiles
    for (const b of this.bullets) b.render(ctx);
    for (const r of this.rockets) r.render(ctx);
    for (const p of this.pellets) p.render(ctx);
    for (const g of this.grenadesList) g.render(ctx);
    for (const exp of this.explosions) exp.render(ctx);

    // 2. Anuncio de Arma Recogida en pantalla ("HEAVY MACHINE GUN!")
    if (this.announcementTimer > 0) {
      ctx.save();
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD000';
      ctx.shadowColor = '#E62429';
      ctx.shadowBlur = 8;
      ctx.fillText(this.weaponAnnouncement, this.position.x, this.position.y - Player.STAND_HEIGHT - 20);
      ctx.restore();
    }

    // 3. I-Frames (parpadeo)
    if (this.isInvulnerable()) {
      const flash = Math.floor(this.iFrameTimer * 12) % 2 === 0;
      if (flash) return;
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.scale(this.facing, 1);

    const state = this.fsm.getState();
    if (state === 'IN_VEHICLE') {
      ctx.restore();
      return;
    }

    const isCrouched = state === 'CROUCH';

    if (isCrouched) {
      // --- MARCO AGACHADO ---
      ctx.fillStyle = '#C29B38';
      ctx.fillRect(-12, -14, 24, 14);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-10, -22, 20, 8);
      ctx.fillStyle = '#B22222';
      ctx.fillRect(-12, -22, 6, 8);
      ctx.fillRect(6, -22, 6, 8);

      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-6, -30, 14, 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-7, -32, 16, 4);
      ctx.fillRect(-12, -31, 5, 3);
      ctx.fillStyle = '#E5C158';
      ctx.fillRect(-5, -34, 12, 3);

      this.renderWeaponSprite(ctx, 8, -20, 0, true);
    } else {
      // --- MARCO DE PIE / CORRIENDO / SALTANDO ---
      const animTime = this.fsm.getStateTime();
      const runBounce = state === 'RUN' ? Math.sin(animTime * 20) * 2 : 0;
      const legOffset = state === 'RUN' ? Math.sin(animTime * 20) * 6 : 0;

      ctx.fillStyle = '#C29B38';
      ctx.fillRect(-10 + legOffset, -20, 8, 14);
      ctx.fillRect(2 - legOffset, -20, 8, 14);

      ctx.fillStyle = '#4A2810';
      ctx.fillRect(-12 + legOffset, -6, 10, 6);
      ctx.fillRect(2 - legOffset, -6, 10, 6);

      ctx.fillStyle = '#2B1704';
      ctx.fillRect(-11, -24 + runBounce, 22, 4);
      ctx.fillStyle = '#C0A040';
      ctx.fillRect(-2, -24 + runBounce, 4, 4);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-9, -38 + runBounce, 18, 14);
      ctx.fillStyle = '#C41E3A';
      ctx.fillRect(-12, -38 + runBounce, 5, 14);
      ctx.fillRect(7, -38 + runBounce, 5, 14);

      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-7, -46 + runBounce, 14, 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-8, -48 + runBounce, 16, 4);
      const bandanaFlutter = Math.sin(animTime * 25) * 2;
      ctx.fillRect(-14, -47 + runBounce + bandanaFlutter, 6, 3);

      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(-6, -51 + runBounce, 12, 3);

      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(2, -44 + runBounce, 3, 2);

      if (state === 'MELEE') {
        // Cuchillo
        ctx.fillStyle = '#F5D0A9';
        ctx.fillRect(4, -32 + runBounce, 16, 6);
        ctx.fillStyle = '#E8E8E8';
        ctx.fillRect(20, -38 + runBounce, 16, 6);
        ctx.fillStyle = '#00E676';
        ctx.fillRect(24, -42 + runBounce, 4, 14);
      } else {
        // Arma de fuego según ángulo
        ctx.save();
        ctx.translate(2, -32 + runBounce);
        const localDirX = this.aimDirection.x * this.facing;
        const localDirY = this.aimDirection.y;
        const armAngle = Math.atan2(localDirY, localDirX);
        ctx.rotate(armAngle);

        this.renderWeaponSprite(ctx, 0, 0, armAngle, false);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private renderWeaponSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    _angle: number,
    isCrouched: boolean
  ): void {
    if (!isCrouched) {
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(x, y - 3, 10, 6);
    }

    switch (this.currentWeapon) {
      case 'HMG': {
        // Ametralladora pesada con cañón largo y tambor de munición
        ctx.fillStyle = '#333333';
        ctx.fillRect(x + 10, y - 5, 16, 6);
        ctx.fillStyle = '#555555';
        ctx.fillRect(x + 26, y - 4, 8, 4);
        ctx.fillStyle = '#C0A040'; // Tambor de munición
        ctx.beginPath();
        ctx.arc(x + 14, y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'ROCKET': {
        // Lanzacohetes tubular verde militar apoyado al hombro
        ctx.fillStyle = '#3E562F';
        ctx.fillRect(x + 4, y - 7, 24, 8);
        ctx.fillStyle = '#26391C';
        ctx.fillRect(x + 28, y - 8, 4, 10);
        break;
      }
      case 'SHOTGUN': {
        // Escopeta pesada con cañón doble y culata de madera
        ctx.fillStyle = '#5A381E'; // Culata madera
        ctx.fillRect(x + 6, y - 3, 6, 5);
        ctx.fillStyle = '#2C3E50'; // Cañón doble
        ctx.fillRect(x + 12, y - 5, 18, 5);
        break;
      }
      case 'PISTOL':
      default: {
        ctx.fillStyle = '#222222';
        ctx.fillRect(x + 10, y - 4, 10, 5);
        ctx.fillRect(x + 9, y + 1, 4, 5);
        break;
      }
    }

    // Muzzle flash al disparar
    if (this.fsm.getState() === 'SHOOT' && this.fireCooldown > 0.03) {
      ctx.fillStyle = '#FFD000';
      ctx.beginPath();
      ctx.arc(x + 28, y - 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x + 28, y - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
