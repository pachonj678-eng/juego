export type InputAction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'JUMP' | 'FIRE' | 'GRENADE';

interface ActionState {
  isDown: boolean;
  justPressed: boolean;
  justReleased: boolean;
  bufferTimer: number; // Input buffering for responsive jumps/attacks
}

export class InputManager {
  private keyMap: Map<string, InputAction> = new Map();
  private actions: Map<InputAction, ActionState> = new Map();
  private readonly BUFFER_DURATION = 0.15; // 150ms buffer window

  constructor() {
    this.initKeyMap();
    this.initActionStates();
    this.bindEvents();
  }

  private initKeyMap(): void {
    // Teclas Direccionales
    this.keyMap.set('ArrowLeft', 'LEFT');
    this.keyMap.set('KeyA', 'LEFT');
    this.keyMap.set('ArrowRight', 'RIGHT');
    this.keyMap.set('KeyD', 'RIGHT');
    this.keyMap.set('ArrowUp', 'UP');
    this.keyMap.set('KeyW', 'UP');
    this.keyMap.set('ArrowDown', 'DOWN');
    this.keyMap.set('KeyS', 'DOWN');

    // Botones de Acción (Arcade Style: J/Z=Disparo, K/X=Salto, L/C=Granada)
    this.keyMap.set('KeyJ', 'FIRE');
    this.keyMap.set('KeyZ', 'FIRE');
    this.keyMap.set('KeyK', 'JUMP');
    this.keyMap.set('KeyX', 'JUMP');
    this.keyMap.set('Space', 'JUMP');
    this.keyMap.set('KeyL', 'GRENADE');
    this.keyMap.set('KeyC', 'GRENADE');
  }

  private initActionStates(): void {
    const actionList: InputAction[] = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'JUMP', 'FIRE', 'GRENADE'];
    for (const action of actionList) {
      this.actions.set(action, {
        isDown: false,
        justPressed: false,
        justReleased: false,
        bufferTimer: 0,
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const action = this.keyMap.get(e.code);
      if (action) {
        // Evitar scroll con flechas o espacio
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }

        const state = this.actions.get(action)!;
        if (!state.isDown) {
          state.justPressed = true;
          state.bufferTimer = this.BUFFER_DURATION;
        }
        state.isDown = true;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      const action = this.keyMap.get(e.code);
      if (action) {
        const state = this.actions.get(action)!;
        state.isDown = false;
        state.justReleased = true;
      }
    });
  }

  public update(dt: number): void {
    // Actualizar temporizadores de buffer
    for (const [, state] of this.actions) {
      if (state.bufferTimer > 0) {
        state.bufferTimer -= dt;
        if (state.bufferTimer < 0) state.bufferTimer = 0;
      }
    }
  }

  public lateUpdate(): void {
    // Resetear estados momentáneos tras el ciclo de frame
    for (const [, state] of this.actions) {
      state.justPressed = false;
      state.justReleased = false;
    }
  }

  public isDown(action: InputAction): boolean {
    return this.actions.get(action)?.isDown ?? false;
  }

  public isJustPressed(action: InputAction): boolean {
    return this.actions.get(action)?.justPressed ?? false;
  }

  public isJustReleased(action: InputAction): boolean {
    return this.actions.get(action)?.justReleased ?? false;
  }

  /**
   * Consume un input en buffer (ideal para saltos y ataques responsivos)
   */
  public consumeBuffered(action: InputAction): boolean {
    const state = this.actions.get(action);
    if (!state) return false;
    if (state.bufferTimer > 0 || state.justPressed) {
      state.bufferTimer = 0;
      state.justPressed = false;
      return true;
    }
    return false;
  }
}
