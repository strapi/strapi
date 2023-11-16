/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { render } from '@testing-library/react';

import type { RenderOptions, RenderResult } from '@testing-library/react';

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    // Automatically create a store instance if no store was passed in
    // store = configureStore({ reducer: { release: releaseReducer } }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult {
  const Wrapper = ({
    children,
  }: React.PropsWithChildren<NonNullable<unknown>>): React.JSX.Element => {
    return <>{children}</>;
  };

  // Return an object with the store and all of RTL's query functions
  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
