export type ParticleType = 'CASING' | 'DUST' | 'SMOKE' | 'SPARK' | 'BLOOD';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  groundBounce: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  public static readonly MAX_PARTICLES = 300;

  constructor() {}

  /**
   * Emite casquillos dorados de bala al disparar (Pistola, HMG, Vulcan)
   */
  public emitCasing(x: number, y: number, facing: 1 | -1): void {
    if (this.particles.length >= ParticleSystem.MAX_PARTICLES) return;

    this.particles.push({
      x,
      y,
      vx: -facing * (100 + Math.random() * 80), // Eyectado hacia atrás
      vy: -180 - Math.random() * 120, // Expulsado hacia arriba
      type: 'CASING',
      life: 2.2,
      maxLife: 2.2,
      size: 4,
      color: '#FFD000', // Latón dorado
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 35,
      groundBounce: true
    });
  }

  /**
   * Emite nubes de polvo al saltar o aterrizar en el suelo
   */
  public emitDust(x: number, y: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= ParticleSystem.MAX_PARTICLES) break;

      const dirX = (Math.random() - 0.5) * 140;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y - 2,
        vx: dirX,
        vy: -20 - Math.random() * 30,
        type: 'DUST',
        life: 0.45,
        maxLife: 0.45,
        size: 3 + Math.random() * 4,
        color: '#D2B48C', // Polvo arena desértica
        rotation: 0,
        vRot: 0,
        groundBounce: false
      });
    }
  }

  /**
   * Emite volutas de humo negro y fuego para explosiones
   */
  public emitExplosionDebris(x: number, y: number, count = 12): void {
    // 1. Humo negro expansivo
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= ParticleSystem.MAX_PARTICLES) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40, // Flotabilidad hacia arriba
        type: 'SMOKE',
        life: 0.75,
        maxLife: 0.75,
        size: 8 + Math.random() * 12,
        color: '#262626', // Humo carbón oscuro
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 4,
        groundBounce: false
      });
    }

    // 2. Chispas metálicas incandescentes
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= ParticleSystem.MAX_PARTICLES) break;

      const angle = -Math.PI * (0.2 + Math.random() * 0.6);
      const speed = 180 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: 'SPARK',
        life: 0.5,
        maxLife: 0.5,
        size: 2,
        color: '#FF6A00',
        rotation: 0,
        vRot: 0,
        groundBounce: true
      });
    }
  }

  /**
   * Emite salpicaduras rojas de corte letal en Melee Knife Override
   */
  public emitBloodSlash(x: number, y: number, facing: 1 | -1): void {
    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= ParticleSystem.MAX_PARTICLES) break;

      this.particles.push({
        x,
        y: y - 24,
        vx: facing * (120 + Math.random() * 160),
        vy: -100 + (Math.random() - 0.5) * 160,
        type: 'BLOOD',
        life: 0.4,
        maxLife: 0.4,
        size: 3 + Math.random() * 3,
        color: '#C41E3A', // Carmesí intenso
        rotation: 0,
        vRot: 0,
        groundBounce: true
      });
    }
  }

  public update(dt: number, groundY: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Físicas según tipo de partícula
      if (p.type === 'CASING') {
        p.vy += 850 * dt; // Gravedad
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;

        // Rebote en suelo
        if (p.y >= groundY - 2) {
          p.y = groundY - 2;
          p.vy = -p.vy * 0.35;
          p.vx *= 0.6;
          p.vRot *= 0.5;
          if (Math.abs(p.vy) < 20) p.vy = 0;
        }
      } else if (p.type === 'SPARK' || p.type === 'BLOOD') {
        p.vy += 920 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.groundBounce && p.y >= groundY) {
          p.y = groundY;
          p.vy = -p.vy * 0.3;
          p.vx *= 0.5;
        }
      } else if (p.type === 'SMOKE') {
        p.vy -= 15 * dt; // Ascenso
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.size += dt * 14; // Expansión de la voluta
        p.rotation += p.vRot * dt;
      } else if (p.type === 'DUST') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.size += dt * 6;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.type === 'CASING') {
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-2, -1, 4, 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-1, -0.5, 2, 1);
      } else if (p.type === 'SMOKE') {
        ctx.rotate(p.rotation);
        ctx.fillStyle = `rgba(38, 38, 38, ${progress * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'DUST') {
        ctx.fillStyle = `rgba(210, 180, 140, ${progress * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'SPARK') {
        ctx.fillStyle = progress > 0.5 ? '#FFD000' : '#FF6A00';
        ctx.fillRect(-1, -1, 2, 2);
      } else if (p.type === 'BLOOD') {
        ctx.fillStyle = `rgba(196, 30, 58, ${progress})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  public getCount(): number {
    return this.particles.length;
  }
}
