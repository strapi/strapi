import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { Stages } from '../Stages';

const STAGES_FIXTURE = [
  {
    id: 1,
    name: 'stage-1',
  },

  {
    id: 2,
    name: 'stage-2',
  },
];

const ComponentFixture = (props) => (
  <IntlProvider locale="en" messages={{}}>
    <ThemeProvider theme={lightTheme}>
      <Stages stages={STAGES_FIXTURE} {...props} />
    </ThemeProvider>
  </IntlProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

describe('Admin | Settings | Review Workflow | Stages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a list of stages', () => {
    const { getByText } = setup();

    expect(getByText(STAGES_FIXTURE[0].name)).toBeInTheDocument();
    expect(getByText(STAGES_FIXTURE[1].name)).toBeInTheDocument();
  });
});
