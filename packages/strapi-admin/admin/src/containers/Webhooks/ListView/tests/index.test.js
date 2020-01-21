import React from 'react';
import { shallow } from 'enzyme';

import { GlobalContextProvider } from 'strapi-helper-plugin';
import ListView from '../index';

describe('Admin | containers | Webhooks | ListView | main', () => {
  describe('Render', () => {
    it('It should render properly', () => {
      const ListViewComponent = () => {
        return (
          <GlobalContextProvider>
            <ListView />
          </GlobalContextProvider>
        );
      };
      shallow(<ListViewComponent />);
    });
  });
});
