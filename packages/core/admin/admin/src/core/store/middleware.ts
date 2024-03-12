import { createListenerMiddleware, type TypedStartListening } from '@reduxjs/toolkit';

import { RootState, Dispatch } from './configure';

export const listenerMiddleware = createListenerMiddleware();

export type AppStartListening = TypedStartListening<RootState, Dispatch>;

export const startTypedListening = listenerMiddleware.startListening as AppStartListening;
