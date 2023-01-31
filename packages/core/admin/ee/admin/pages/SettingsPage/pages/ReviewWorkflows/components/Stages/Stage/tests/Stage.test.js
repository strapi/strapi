import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { Stage } from '../Stage';

const STAGES_FIXTURE = {
  id: 1,
  name: 'stage-1',
};

const ComponentFixture = (props) => (
  <IntlProvider locale="en" messages={{}}>
    <ThemeProvider theme={lightTheme}>
      <Stage {...STAGES_FIXTURE} {...props} />
    </ThemeProvider>
  </IntlProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

const user = userEvent.setup();

describe('Admin | Settings | Review Workflow | Stage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a stage', async () => {
    const { getByRole, queryByRole } = setup();

    expect(queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(getByRole('button'));

    expect(queryByRole('textbox')).toBeInTheDocument();
    expect(getByRole('textbox').value).toBe(STAGES_FIXTURE.name);
  });
});
