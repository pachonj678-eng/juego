export class GameLoop {
  public static readonly FIXED_TIMESTEP = 1 / 60; // 60 FPS fijos para física determinista
  private static readonly MAX_ACCUMULATOR = 0.25; // Prevenir espiral de la muerte

  private updateFn: (dt: number) => void;
  private renderFn: (alpha: number) => void;

  private isRunning = false;
  private accumulator = 0;
  private lastTime = 0;
  private animFrameId: number | null = null;

  // Métricas de rendimiento
  private frameCount = 0;
  private lastFpsUpdate = 0;
  public currentFps = 60;

  constructor(updateFn: (dt: number) => void, renderFn: (alpha: number) => void) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.lastFpsUpdate = this.lastTime;
    this.animFrameId = requestAnimationFrame(this.step.bind(this));
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private step(currentTime: number): void {
    if (!this.isRunning) return;

    let frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Calcular FPS reales
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    if (frameTime > GameLoop.MAX_ACCUMULATOR) {
      frameTime = GameLoop.MAX_ACCUMULATOR;
    }

    this.accumulator += frameTime;

    // Ejecutar ticks físicos de paso fijo
    while (this.accumulator >= GameLoop.FIXED_TIMESTEP) {
      this.updateFn(GameLoop.FIXED_TIMESTEP);
      this.accumulator -= GameLoop.FIXED_TIMESTEP;
    }

    // Factor alfa de interpolación para renderizado
    const alpha = this.accumulator / GameLoop.FIXED_TIMESTEP;
    this.renderFn(alpha);

    this.animFrameId = requestAnimationFrame(this.step.bind(this));
  }
}
