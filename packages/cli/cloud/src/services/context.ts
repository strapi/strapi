// This file will manage the CLI context state.

import { CLIContext } from '../types';

let ctx: CLIContext;

export function setContext(newCtx: CLIContext): void {
  ctx = newCtx;
}

export function getContext(): CLIContext {
  return ctx;
}
