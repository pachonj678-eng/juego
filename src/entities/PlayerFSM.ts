export type PlayerStateName =
  | 'IDLE'
  | 'RUN'
  | 'JUMP'
  | 'FALL'
  | 'CROUCH'
  | 'SHOOT'
  | 'MELEE'
  | 'IN_VEHICLE'
  | 'HURT'
  | 'DEATH';

export interface StateContext {
  onEnter?: (prevState: PlayerStateName) => void;
  onUpdate?: (dt: number) => void;
  onExit?: (nextState: PlayerStateName) => void;
}

export class PlayerFSM {
  private currentState: PlayerStateName = 'IDLE';
  private previousState: PlayerStateName = 'IDLE';
  private stateTime = 0;
  private states: Map<PlayerStateName, StateContext> = new Map();

  constructor() {}

  public registerState(name: PlayerStateName, context: StateContext): void {
    this.states.set(name, context);
  }

  public setState(nextState: PlayerStateName): boolean {
    if (this.currentState === nextState) return false;

    // Estados bloqueantes
    if (this.currentState === 'DEATH') return false;

    const currentContext = this.states.get(this.currentState);
    if (currentContext?.onExit) {
      currentContext.onExit(nextState);
    }

    this.previousState = this.currentState;
    this.currentState = nextState;
    this.stateTime = 0;

    const nextContext = this.states.get(nextState);
    if (nextContext?.onEnter) {
      nextContext.onEnter(this.previousState);
    }

    return true;
  }

  public update(dt: number): void {
    this.stateTime += dt;
    const currentContext = this.states.get(this.currentState);
    if (currentContext?.onUpdate) {
      currentContext.onUpdate(dt);
    }
  }

  public getState(): PlayerStateName {
    return this.currentState;
  }

  public getPreviousState(): PlayerStateName {
    return this.previousState;
  }

  public getStateTime(): number {
    return this.stateTime;
  }

  public isCrouched(): boolean {
    return this.currentState === 'CROUCH';
  }

  public isAirborne(): boolean {
    return this.currentState === 'JUMP' || this.currentState === 'FALL';
  }

  public isAttacking(): boolean {
    return this.currentState === 'SHOOT' || this.currentState === 'MELEE';
  }
}
