import type { TransferStage } from '../../../../types';

export type Step =
  | { kind: 'action'; action: string }
  | { kind: 'transfer'; stage: TransferStage; locked?: boolean };

export { default as DEFAULT_TRANSFER_FLOW } from './default';

interface IState {
  step: Step | null;
}

export const createFlow = (flow: readonly Step[]) => {
  const state: IState = { step: null };

  /**
   * Equality check between two steps
   */
  const stepEqual = (stepA: Step, stepB: Step): boolean => {
    if (stepA.kind === 'action' && stepB.kind === 'action') {
      return stepA.action === stepB.action;
    }

    if (stepA.kind === 'transfer' && stepB.kind === 'transfer') {
      return stepA.stage === stepB.stage;
    }

    return false;
  };

  /**
   * Find the index for a given step
   */
  const findStepIndex = (step: Step) => flow.findIndex((flowStep) => stepEqual(step, flowStep));

  return {
    has(step: Step) {
      return findStepIndex(step) !== -1;
    },

    can(step: Step) {
      if (state.step === null) {
        return true;
      }

      const indexesDifference = findStepIndex(step) - findStepIndex(state.step);

      // It's possible to send multiple time the same transfer step in a row
      if (indexesDifference === 0 && step.kind === 'transfer') {
        return true;
      }

      return indexesDifference > 0;
    },

    cannot(step: Step) {
      return !this.can(step);
    },

    set(step: Step) {
      const canSwitch = this.can(step);

      if (!canSwitch) {
        throw new Error('Impossible to proceed to the given step');
      }

      state.step = step;

      return this;
    },

    get() {
      return state.step;
    },
  };
};

export type TransferFlow = ReturnType<typeof createFlow>;
