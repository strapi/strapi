import React from 'react';
import { shallow } from 'enzyme';

import AppLoader from 'containers/AppLoader';
import NotificationProvider from '../../NotificationProvider';
import App from '../index';


describe('<App />', () => {
  it('should render the <AppLoader />', () => {
    const renderedComponent = shallow(<App />);
    expect(renderedComponent.find(NotificationProvider)).toHaveLength(1);
    expect(renderedComponent.find(AppLoader)).toHaveLength(1);
  });
});
