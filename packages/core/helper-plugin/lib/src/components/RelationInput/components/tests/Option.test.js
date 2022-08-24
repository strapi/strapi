import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import ReactSelect from '../../../ReactSelect';
import { Option } from '../Option';

const setup = (props) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}}>
        <ReactSelect components={{ Option }} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

describe('RelationInput || Option', () => {
  it('should render custom Option with published state title', () => {
    setup({ options: [{ value: { id: 1, publishedAt: 'something' }, label: 'relation 1' }] });

    act(() => {
      fireEvent.mouseDown(screen.getByRole('button'));
    });

    expect(screen.getByText('relation 1')).toBeInTheDocument();
    expect(screen.getByTitle('State: Published')).toBeInTheDocument();
  });

  it('should render custom Option with published state title', () => {
    setup({ options: [{ value: { id: 1, publishedAt: null }, label: 'relation 1' }] });

    act(() => {
      fireEvent.mouseDown(screen.getByRole('button'));
    });

    expect(screen.getByText('relation 1')).toBeInTheDocument();
    expect(screen.getByTitle('State: Draft')).toBeInTheDocument();
  });
});
