import React from 'react';
import { shallow } from 'enzyme';

import { GlobalContextProvider } from 'strapi-helper-plugin';
import EditView from '../index';

describe('Admin | containers | Webhooks | EditView | main', () => {
  describe('Render', () => {
    it('It should render properly', () => {
      const EditViewComponent = () => {
        return (
          <GlobalContextProvider>
            <EditView />
          </GlobalContextProvider>
        );
      };
      shallow(<EditViewComponent />);
    });
  });
});
