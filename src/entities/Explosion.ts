import { Vector2 } from '../engine/Vector2.js';

export class Explosion {
  public position: Vector2;
  public radius: number;
  public maxRadius: number;
  public duration: number;
  public timer = 0;
  public isAlive = true;
  public damage: number;
  public hasDealtDamage = false;

  constructor(x: number, y: number, maxRadius = 50, duration = 0.4, damage = 25) {
    this.position = new Vector2(x, y);
    this.radius = 8;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.damage = damage;
  }

  public update(dt: number): void {
    if (!this.isAlive) return;

    this.timer += dt;
    const progress = this.timer / this.duration;

    if (progress >= 1) {
      this.isAlive = false;
      return;
    }

    // Expansión rápida inicial y luego disipación con humo
    if (progress < 0.4) {
      this.radius = 8 + (this.maxRadius - 8) * (progress / 0.4);
    } else {
      this.radius = this.maxRadius * (1 - (progress - 0.4) * 0.5);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    const progress = this.timer / this.duration;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // 1. Núcleo de fuego ardiente (blanco -> amarillo -> rojo)
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = progress < 0.3 ? '#FFFFFF' : (progress < 0.6 ? '#FFD000' : '#E62429');
    ctx.fill();

    // 2. Anillo de onda expansiva
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 106, 0, ${1 - progress})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Volutas de humo negro estilo Neo Geo
    if (progress > 0.3) {
      ctx.fillStyle = `rgba(40, 40, 40, ${0.9 - progress * 0.8})`;
      ctx.beginPath();
      ctx.arc(-this.radius * 0.5, -this.radius * 0.4, this.radius * 0.6, 0, Math.PI * 2);
      ctx.arc(this.radius * 0.4, -this.radius * 0.5, this.radius * 0.5, 0, Math.PI * 2);
      ctx.arc(0, this.radius * 0.4, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
