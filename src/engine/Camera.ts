export class Camera {
  public x = 0;
  public y = 0;

  // Sistema de Screen Shake basado en Trauma (Modelo Matemático Exponencial)
  private trauma = 0; // 0.0 a 1.0
  private readonly TRAUMA_DECAY = 1.35; // Tasa de disipación por segundo
  private readonly MAX_OFFSET = 18; // Desplazamiento máximo en píxeles
  private readonly MAX_ANGLE = 0.05; // Rotación máxima en radianes (~3 grados)

  public currentOffsetX = 0;
  public currentOffsetY = 0;
  public currentRotation = 0;

  constructor() {}

  /**
   * Añade trauma al Screen Shake (se acumula hasta 1.0)
   * @param amount 0.2 a 0.4 para disparo moderado, 0.7 a 1.0 para explosión violenta
   */
  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public update(dt: number): void {
    if (this.trauma > 0) {
      // Disipación exponencial del trauma
      this.trauma = Math.max(0, this.trauma - this.TRAUMA_DECAY * dt);

      // Desplazamiento no lineal (trauma^2) para mayor impacto perceptivo
      const shakePower = this.trauma * this.trauma;
      this.currentOffsetX = (Math.random() * 2 - 1) * this.MAX_OFFSET * shakePower;
      this.currentOffsetY = (Math.random() * 2 - 1) * this.MAX_OFFSET * shakePower;
      this.currentRotation = (Math.random() * 2 - 1) * this.MAX_ANGLE * shakePower;
    } else {
      this.currentOffsetX = 0;
      this.currentOffsetY = 0;
      this.currentRotation = 0;
    }
  }

  /**
   * Aplica la matriz de transformación del Screen Shake al Canvas Context
   */
  public applyTransform(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.trauma > 0.005) {
      ctx.save();
      // Rotar respecto al centro del viewport para evitar desalineación
      ctx.translate(width * 0.5 + this.currentOffsetX, height * 0.5 + this.currentOffsetY);
      ctx.rotate(this.currentRotation);
      ctx.translate(-width * 0.5, -height * 0.5);
    }
  }

  public restoreTransform(ctx: CanvasRenderingContext2D): void {
    if (this.trauma > 0.005) {
      ctx.restore();
    }
  }

  public getTrauma(): number {
    return this.trauma;
  }
}
