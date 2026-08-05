import type { MaybePromise } from '../../types';

export type ConfirmationCallback = (message: string) => MaybePromise<boolean>;
