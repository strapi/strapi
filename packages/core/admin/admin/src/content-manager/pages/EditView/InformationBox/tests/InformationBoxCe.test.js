/**
 *
 * Tests for Information
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { InformationBoxCE } from '../InformationBoxCE';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
}));

const ComponentFixture = (props) => {
  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}}>
        <InformationBoxCE {...props} />
      </IntlProvider>
    </ThemeProvider>
  );
};

const setup = (props) => {
  return render(<ComponentFixture {...props} />);
};

describe('CONTENT MANAGER | EditView | InformationBoxCE', () => {
  const RealNow = Date.now;

  beforeAll(() => {
    global.Date.now = jest.fn(() => new Date('2022-09-20').getTime());
  });

  afterAll(() => {
    global.Date.now = RealNow;
  });

  it('renders the title and body of the Information component', () => {
    useCMEditViewDataManager.mockImplementationOnce(() => ({
      initialData: {},
      isCreatingEntry: true,
    }));

    const { getByText } = setup();

    expect(getByText('Information')).toBeInTheDocument();
    expect(getByText('Last update')).toBeInTheDocument();
  });
});
