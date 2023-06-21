import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
/**
 * TODO: this will come in another PR.
 */
// eslint-disable-next-line no-restricted-imports
import { ReactSelect } from '@strapi/helper-plugin';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { Option } from '../Option';

const setup = (props) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}}>
        <ReactSelect components={{ Option }} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

describe('Content-Manager || RelationInput || Option', () => {
  it('should render custom Option with published state title', () => {
    setup({ options: [{ id: 1, mainField: 'relation 1', publicationState: 'published' }] });

    act(() => {
      fireEvent.mouseDown(screen.getByRole('combobox'));
    });

    expect(screen.getByText('relation 1')).toBeInTheDocument();
    expect(screen.getByTitle('State: Published')).toBeInTheDocument();
  });

  it('should render custom Option with draft state title', () => {
    setup({ options: [{ id: 1, mainField: 'relation 1', publicationState: 'draft' }] });

    act(() => {
      fireEvent.mouseDown(screen.getByRole('combobox'));
    });

    expect(screen.getByText('relation 1')).toBeInTheDocument();
    expect(screen.getByTitle('State: Draft')).toBeInTheDocument();
  });
});
