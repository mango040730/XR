export interface MovementInput { right: number; forward: number }
export interface InputSource { readMovement(): MovementInput; clear(): void; dispose(): void }
