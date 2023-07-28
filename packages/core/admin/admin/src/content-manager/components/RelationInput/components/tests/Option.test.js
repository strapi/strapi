import React from 'react';

import { ThemeProvider, lightTheme, Combobox } from '@strapi/design-system';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { Option } from '../Option';

const setup = (props) => ({
  user: userEvent.setup(),
  ...render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}}>
        <Combobox>
          {props.options.map((opt) => (
            <Option {...opt} />
          ))}
        </Combobox>
      </IntlProvider>
    </ThemeProvider>
  ),
});

describe('Content-Manager || RelationInput || Option', () => {
  it('should render custom Option with published state title', async () => {
    const { user, getByRole, getByText, getByTitle } = setup({
      options: [{ id: 1, mainField: 'relation 1', publicationState: 'published' }],
    });

    await user.click(getByRole('combobox'));

    expect(getByText('relation 1')).toBeInTheDocument();
    expect(getByTitle('State: Published')).toBeInTheDocument();
  });

  it('should render custom Option with draft state title', async () => {
    const { user, getByRole, getByText, getByTitle } = setup({
      options: [{ id: 1, mainField: 'relation 1', publicationState: 'draft' }],
    });

    await user.click(getByRole('combobox'));

    expect(getByText('relation 1')).toBeInTheDocument();
    expect(getByTitle('State: Draft')).toBeInTheDocument();
  });

  it('should render custom Option with mainField prop as number type', async () => {
    const { user, getByRole } = setup({
      options: [{ id: 1, mainField: 1, publicationState: 'published' }],
    });

    await user.click(getByRole('combobox'));

    expect(getByRole('option', { publicationState: 'State: Published' })).toBeInTheDocument();
  });
});
