import { Vector2 } from '../engine/Vector2.js';
import { AABB } from '../engine/AABB.js';

export type PickupType = 'H' | 'R' | 'S' | 'BOMB';

export class WeaponPickup {
  public position: Vector2;
  public type: PickupType;
  public hitbox: AABB;
  public isAlive = true;
  private animTimer = 0;
  private baseY: number;

  constructor(x: number, y: number, type: PickupType) {
    this.position = new Vector2(x, y);
    this.baseY = y;
    this.type = type;
    this.hitbox = new AABB(x - 14, y - 24, 28, 24);
  }

  public update(dt: number): void {
    if (!this.isAlive) return;

    this.animTimer += dt * 3;
    // Flotación suave estilo arcade
    const floatOffset = Math.sin(this.animTimer) * 4;
    this.position.y = this.baseY + floatOffset;
    this.hitbox.set(this.position.x - 14, this.position.y - 24, 28, 24);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Caja de armamento militar Neo Geo (caja verde con borde metálico y letra brillante)
    // Sombra en el suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Caja militar
    ctx.fillStyle = '#4A6B3A';
    ctx.fillRect(-12, -22, 24, 20);

    // Marcos de refuerzo metálico
    ctx.strokeStyle = '#26391C';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -22, 24, 20);

    // Remaches de las esquinas
    ctx.fillStyle = '#C0A040';
    ctx.fillRect(-11, -21, 3, 3);
    ctx.fillRect(8, -21, 3, 3);
    ctx.fillRect(-11, -5, 3, 3);
    ctx.fillRect(8, -5, 3, 3);

    // Letra o Símbolo del arma
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let color = '#FFD000';
    let text: string = this.type;

    if (this.type === 'H') {
      color = '#FFD000'; // Amarillo Heavy Machine Gun
    } else if (this.type === 'R') {
      color = '#E62429'; // Rojo Rocket Launcher
    } else if (this.type === 'S') {
      color = '#00E676'; // Verde Shotgun
    } else if (this.type === 'BOMB') {
      color = '#FF6A00';
      text = '💣';
    }

    ctx.fillStyle = color;
    ctx.fillText(text, 0, -12);

    ctx.restore();
  }
}
