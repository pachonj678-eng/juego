import { Player } from '../entities/Player.js';
import { RebelSoldier } from '../entities/RebelSoldier.js';
import { RebelTank } from '../entities/RebelTank.js';
import { RebelChopper } from '../entities/RebelChopper.js';
import { EnemyBullet } from '../entities/EnemyBullet.js';
import { EnemyGrenade } from '../entities/EnemyGrenade.js';
import { WeaponPickup } from '../entities/WeaponPickup.js';
import { VehicleSlug } from '../entities/VehicleSlug.js';
import { POW } from '../entities/POW.js';

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public width = 640;
  public height = 360;
  public groundY = 300;
  public showDebug = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.imageSmoothingEnabled = false;
  }

  public render(
    player: Player,
    soldiers: RebelSoldier[],
    tank: RebelTank,
    chopper: RebelChopper,
    enemyBullets: EnemyBullet[],
    enemyGrenades: EnemyGrenade[],
    pickups: WeaponPickup[],
    slug: VehicleSlug,
    pows: POW[],
    fps: number
  ): void {
    const ctx = this.ctx;

    // 1. Limpieza de pantalla
    ctx.clearRect(0, 0, this.width, this.height);

    // 2. Fondo Arcade Desértico (Homenaje a Metal Slug Misión 1)
    this.renderBackground(ctx);

    // 3. Suelo de combate
    this.renderGround(ctx);

    // 4. Cajas de Armamento (Pickups)
    for (const pickup of pickups) {
      pickup.render(ctx);
    }

    // 5. Prisioneros de Guerra (POWs)
    for (const pow of pows) {
      pow.render(ctx);
    }

    // 6. Tanque del Jugador SV-001 "Metal Slug"
    slug.render(ctx);

    // 7. Enemigos Pesados: Tanque "Iron Iso" y Helicóptero "R-Shobu"
    tank.render(ctx);
    chopper.render(ctx);

    // 8. Soldados de Infantería con IA FSM
    for (const soldier of soldiers) {
      soldier.render(ctx);
    }

    // 9. Proyectiles Enemigos (Balas y Granadas de palo)
    for (const eb of enemyBullets) {
      eb.render(ctx);
    }
    for (const eg of enemyGrenades) {
      eg.render(ctx);
    }

    // 10. Jugador (Marco Rossi) si no está dentro del tanque
    player.render(ctx);

    // 11. Overlays de Debug / Hitboxes Matemáticos
    if (this.showDebug) {
      this.renderDebugInfo(ctx, player, soldiers, tank, chopper, enemyBullets, enemyGrenades, pickups, slug, pows, fps);
    }

    // 12. HUD Arcade Superior Dinámico
    this.renderHUD(ctx, player, slug);
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#E67E22');
    skyGrad.addColorStop(0.5, '#F39C12');
    skyGrad.addColorStop(1, '#F1C40F');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.groundY);

    ctx.fillStyle = '#FFEAA7';
    ctx.beginPath();
    ctx.arc(520, 90, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D35400';
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.quadraticCurveTo(120, 180, 260, this.groundY);
    ctx.quadraticCurveTo(420, 200, 640, this.groundY);
    ctx.lineTo(640, this.groundY);
    ctx.lineTo(0, this.groundY);
    ctx.fill();

    ctx.fillStyle = '#BA4A00';
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.quadraticCurveTo(200, 230, 400, this.groundY);
    ctx.quadraticCurveTo(530, 240, 640, this.groundY);
    ctx.lineTo(640, this.groundY);
    ctx.lineTo(0, this.groundY);
    ctx.fill();

    ctx.fillStyle = '#563517';
    ctx.fillRect(80, 210, 16, 90);
    ctx.fillRect(74, 204, 28, 8);
    ctx.fillRect(290, 230, 20, 70);
    ctx.fillRect(285, 224, 30, 8);
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    ctx.fillStyle = '#5A2D0C';
    ctx.fillRect(0, this.groundY, this.width, 6);

    ctx.fillStyle = '#3E1C06';
    for (let x = 10; x < this.width; x += 40) {
      ctx.fillRect(x, this.groundY + 2, 4, 2);
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D, player: Player, slug: VehicleSlug): void {
    ctx.save();
    ctx.font = '10px "Press Start 2P", monospace';

    // 1. PUNTUACIÓN (1UP)
    ctx.fillStyle = '#E62429';
    ctx.fillText('1UP', 20, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(player.score.toString().padStart(6, '0'), 65, 24);

    // 2. HUD según si está a pie o dentro del SV-001
    if (slug.state === 'OCCUPIED') {
      ctx.fillStyle = slug.health === 3 ? '#00E676' : (slug.health === 2 ? '#FFD000' : '#E62429');
      let hearts = '';
      for (let h = 0; h < slug.maxHealth; h++) {
        hearts += h < slug.health ? '♥' : '-';
      }
      ctx.fillText(`SLUG HP:[${hearts}]`, 160, 24);

      ctx.fillStyle = '#E62429';
      ctx.fillText('CANNON:', 340, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(slug.cannonAmmo.toString().padStart(2, '0'), 425, 24);

      ctx.fillStyle = '#00E676';
      ctx.fillText('VULCAN 360°', 465, 24);
    } else {
      let weaponColor = '#00E676';
      if (player.currentWeapon === 'HMG') weaponColor = '#FFD000';
      else if (player.currentWeapon === 'ROCKET') weaponColor = '#E62429';
      else if (player.currentWeapon === 'SHOTGUN') weaponColor = '#FF6A00';

      ctx.fillStyle = weaponColor;
      const wName = player.getWeaponName(player.currentWeapon).toUpperCase();
      ctx.fillText(`ARMS: ${wName}`, 170, 24);

      const ammoStr = player.ammo === Infinity ? '[∞]' : `[${player.ammo.toString().padStart(3, '0')}]`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ammoStr, 375, 24);

      ctx.fillStyle = '#E62429';
      ctx.fillText('BOMB:', 440, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(player.grenades.toString().padStart(2, '0'), 500, 24);

      ctx.fillStyle = '#FFD000';
      ctx.fillText(`x${player.lives}`, 560, 24);
    }

    ctx.restore();
  }

  private renderDebugInfo(
    ctx: CanvasRenderingContext2D,
    player: Player,
    soldiers: RebelSoldier[],
    tank: RebelTank,
    chopper: RebelChopper,
    enemyBullets: EnemyBullet[],
    enemyGrenades: EnemyGrenade[],
    pickups: WeaponPickup[],
    slug: VehicleSlug,
    pows: POW[],
    fps: number
  ): void {
    ctx.save();

    // 1. Hitbox del Jugador (Verde)
    if (player.fsm.getState() !== 'IN_VEHICLE') {
      ctx.strokeStyle = '#00E676';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(player.hitbox.x, player.hitbox.y, player.hitbox.width, player.hitbox.height);

      ctx.strokeStyle = 'rgba(230, 36, 41, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        player.meleeRangeBox.x,
        player.meleeRangeBox.y,
        player.meleeRangeBox.width,
        player.meleeRangeBox.height
      );
      ctx.setLineDash([]);
    }

    // 2. Hitbox del Tanque SV-001 (Cyan)
    if (slug.state !== 'DESTROYED') {
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(slug.hitbox.x, slug.hitbox.y, slug.hitbox.width, slug.hitbox.height);
    }

    // 3. Hitbox del Tanque Rebelde "Iron Iso" (Rojo)
    if (tank.isAlive) {
      ctx.strokeStyle = '#E62429';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tank.hitbox.x, tank.hitbox.y, tank.hitbox.width, tank.hitbox.height);
    }

    // 4. Hitbox del Helicóptero "R-Shobu" (Naranja)
    if (chopper.isAlive) {
      ctx.strokeStyle = '#FF6A00';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(chopper.hitbox.x, chopper.hitbox.y, chopper.hitbox.width, chopper.hitbox.height);
    }

    // 5. Hitboxes de Infantería (Amarillo)
    for (const soldier of soldiers) {
      if (soldier.isAlive) {
        ctx.strokeStyle = '#FFD000';
        ctx.lineWidth = 1;
        ctx.strokeRect(soldier.hitbox.x, soldier.hitbox.y, soldier.hitbox.width, soldier.hitbox.height);
      }
    }

    // 6. Granadas y Balas Enemigas
    for (const eg of enemyGrenades) {
      if (eg.isAlive) {
        ctx.strokeStyle = '#FF0055';
        ctx.strokeRect(eg.hitbox.x, eg.hitbox.y, eg.hitbox.width, eg.hitbox.height);
      }
    }

    // 7. Panel de Telemetría
    ctx.fillStyle = 'rgba(11, 14, 20, 0.9)';
    ctx.fillRect(10, this.height - 90, 360, 82);
    ctx.strokeStyle = '#2A3040';
    ctx.strokeRect(10, this.height - 90, 360, 82);

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#00E676';
    ctx.fillText(`FPS: ${fps} (60Hz Determinista)`, 18, this.height - 76);
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(`SLUG: ${slug.state} (HP: ${slug.health}/3, SHELLS: ${slug.cannonAmmo})`, 18, this.height - 62);
    ctx.fillStyle = '#FFD000';
    ctx.fillText(`ENEMIGOS: INF(${soldiers.filter((s) => s.isAlive).length}) TANK(${tank.health}HP) AIR(${chopper.health}HP)`, 18, this.height - 48);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`POWS ACTIVOS: ${pows.filter((p) => p.isAlive).length}`, 18, this.height - 34);
    ctx.fillStyle = '#FF6A00';
    ctx.fillText(`HIT-FLASH BLANCO: TANK(${tank.hitFlashTimer > 0}) AIR(${chopper.hitFlashTimer > 0})`, 18, this.height - 20);

    ctx.restore();
  }
}
