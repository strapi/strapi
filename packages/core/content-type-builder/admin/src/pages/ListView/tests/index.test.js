/**
 *
 * Tests for ListView
 *
 */

import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import LanguageProvider from '../../../../../../admin/admin/src/components/LanguageProvider';
import Theme from '../../../../../../admin/admin/src/components/Theme';
import en from '../../../../../../admin/admin/src/translations/en.json';
import pluginEn from '../../../translations/en.json';
import getTrad from '../../../utils/getTrad';

import ListView from '../index';
import mockData from './mockData';

jest.mock('../../../hooks/useDataManager', () => {
  return jest.fn(() => ({
    initialData: mockData,
    modifiedData: mockData,
    isInDevelopmentMode: true,
    isInContentTypeView: true,
    submitData: () => {},
    toggleModalCancel: () => {},
  }));
});

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
}));

const makeApp = () => {
  const history = createMemoryHistory();
  const messages = {
    en: Object.keys(pluginEn).reduce(
      (acc, current) => {
        acc[getTrad(current)] = pluginEn[current];

        return acc;
      },
      { ...en }
    ),
  };

  const localeNames = { en: 'English' };

  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <Theme>
        <Router history={history}>
          <ListView />
        </Router>
      </Theme>
    </LanguageProvider>
  );
};

describe('<ListView />', () => {
  it('renders and matches the snapshot', () => {
    const App = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });
});
