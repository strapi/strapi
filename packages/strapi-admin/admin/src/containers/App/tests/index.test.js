import React from 'react';
import { shallow } from 'enzyme';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';

import { App } from '../../App';

describe('<App />', () => {
  it('should render the <AppLoader />', () => {
    const renderedComponent = shallow(<App getDataSucceeded={jest.fn()} />);
    expect(renderedComponent.find(LoadingIndicatorPage)).toHaveLength(1);
  });
});
