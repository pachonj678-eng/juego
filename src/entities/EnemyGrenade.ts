import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';
import { Explosion } from './Explosion.js';
import { Player } from './Player.js';
import { VehicleSlug } from './VehicleSlug.js';

export class EnemyGrenade {
  public position: Vector2;
  public velocity: Vector2;
  public hitbox: AABB;
  public isAlive = true;
  private fuseTimer = 1.2;
  private readonly GRAVITY = 950;
  private readonly RESTITUTION = 0.4;
  private rotation = 0;

  constructor(x: number, y: number, targetX: number) {
    this.position = new Vector2(x, y);
    const dx = targetX - x;
    const dirX = dx >= 0 ? 1 : -1;
    const speedX = Math.min(260, Math.max(140, Math.abs(dx) * 0.9));
    this.velocity = new Vector2(dirX * speedX, -340);
    this.hitbox = new AABB(x - 5, y - 5, 10, 10);
  }

  public update(
    dt: number,
    groundY: number,
    player: Player,
    slug: VehicleSlug,
    onExplode: (exp: Explosion) => void
  ): void {
    if (!this.isAlive) return;

    this.velocity.y += this.GRAVITY * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.rotation += this.velocity.x * 0.04;
    this.hitbox.set(this.position.x - 5, this.position.y - 5, 10, 10);

    // Rebote en suelo
    if (this.position.y >= groundY - 4) {
      this.position.y = groundY - 4;
      this.velocity.y = -this.velocity.y * this.RESTITUTION;
      this.velocity.x *= 0.75;
      if (Math.abs(this.velocity.y) < 35) this.velocity.y = 0;
    }

    this.fuseTimer -= dt;
    if (this.fuseTimer <= 0) {
      this.detonate(player, slug, onExplode);
      return;
    }

    // Impacto directo con jugador o tanque
    if (player.fsm.getState() !== 'IN_VEHICLE' && this.hitbox.intersects(player.hitbox)) {
      this.detonate(player, slug, onExplode);
      return;
    }
    if (slug.state === 'OCCUPIED' && this.hitbox.intersects(slug.hitbox)) {
      this.detonate(player, slug, onExplode);
      return;
    }
  }

  private detonate(player: Player, slug: VehicleSlug, onExplode: (exp: Explosion) => void): void {
    this.isAlive = false;
    const exp = new Explosion(this.position.x, this.position.y, 45, 0.4, 25);
    onExplode(exp);

    // Daño a jugador a pie
    if (player.fsm.getState() !== 'IN_VEHICLE' && this.position.distanceTo(player.position) <= 45) {
      if (!player.isInvulnerable()) {
        player.lives = Math.max(0, player.lives - 1);
        player.grantIFrames(Player.DEFAULT_IFRAME_DURATION);
      }
    }

    // Daño al tanque
    if (slug.state === 'OCCUPIED' && this.position.distanceTo(slug.position) <= 50) {
      slug.takeDamage(1);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    // Granada de palo rebelde Stielhandgranate (mango de madera y cabeza explosiva cilíndrica)
    ctx.fillStyle = '#8B5A2B'; // Mango madera
    ctx.fillRect(-2, -2, 4, 12);
    ctx.fillStyle = '#4A6B3A'; // Cabeza metálica
    ctx.fillRect(-4, -10, 8, 8);
    ctx.fillStyle = '#26391C';
    ctx.strokeRect(-4, -10, 8, 8);

    ctx.restore();
  }
}
