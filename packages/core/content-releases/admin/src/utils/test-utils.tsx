/* eslint-disable check-file/filename-naming-convention */
import React, { PropsWithChildren } from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';

import { releaseReducer } from '../../modules/releaseSlice';

import type { CreatedStore } from '../../store/store';
import type { RenderOptions } from '@testing-library/react';

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  store?: CreatedStore;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    // Automatically create a store instance if no store was passed in
    store = configureStore({ reducer: { release: releaseReducer } }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  const Wrapper = ({ children }: PropsWithChildren<NonNullable<unknown>>): React.JSX.Element => {
    return <Provider store={store}>{children}</Provider>;
  };

  // Return an object with the store and all of RTL's query functions
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
