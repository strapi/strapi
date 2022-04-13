import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@strapi/design-system/ThemeProvider';
import { lightTheme } from '@strapi/design-system/themes';
import { Router } from 'react-router-dom';
import { TrackingContext } from '@strapi/helper-plugin';
import { createMemoryHistory } from 'history';
import * as yup from 'yup';
import { IntlProvider } from 'react-intl';
import Register from '..';

jest.mock('../../../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale: () => {},
  localeNames: ['en'],
  messages: ['test'],
}));
jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => jest.fn({}),
}));

describe('ADMIN | PAGES | AUTH | Register', () => {
  it('should render and match the snapshot', () => {
    const history = createMemoryHistory();
    const { container } = render(
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <TrackingContext.Provider value={{ uuid: null, telemetryProperties: undefined }}>
          <ThemeProvider theme={lightTheme}>
            <Router history={history}>
              <Register
                authType="register-admin"
                fieldsToDisable={[]}
                noSignin
                onSubmit={() => {}}
                schema={yup.object()}
              />
            </Router>
          </ThemeProvider>
        </TrackingContext.Provider>
      </IntlProvider>
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
