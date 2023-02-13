import React from 'react';
import { IntlProvider } from 'react-intl';
import { render as renderTL, fireEvent } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import AddLogoDialog from '../AddLogoDialog';

const render = (props) =>
  renderTL(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <AddLogoDialog goTo={jest.fn} onClose={jest.fn} setLocalImage={jest.fn} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

describe('ApplicationInfosPage | AddLogoDialog', () => {
  it('shoud render from computer tab and match snapshot', () => {
    const { container, getByText } = render();

    expect(getByText('Drag and Drop here or')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('shoud render from url tab and match snapshot', () => {
    const { container, getByRole } = render();

    fireEvent.click(getByRole('tab', { name: 'From url' }));

    expect(getByRole('textbox', { name: 'URL' })).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
