import React from 'react';
import { shallow } from 'enzyme';
import { Route } from 'react-router-dom';

import AppLoader from '../../AppLoader';
import { App } from '../../App';

describe('<App />', () => {
  it('should render the <AppLoader />', () => {
    const renderedComponent = shallow(<App getDataSucceeded={jest.fn()} />);
    expect(renderedComponent.find(AppLoader)).toHaveLength(1);
  });

  it('Should render the <Switch /> if the app is loading', () => {
    const topComp = shallow(<App getDataSucceeded={jest.fn()} />);
    const insideAppLoaderNotLoading = shallow(
      topComp.find(AppLoader).prop('children')({ shouldLoad: false })
    );

    expect(insideAppLoaderNotLoading.find(Route).length).toBe(3);
  });

  it('should not render the <Switch /> if the app is loading', () => {
    const topComp = shallow(<App getDataSucceeded={jest.fn()} />);

    const insideAppLoaderLoading = shallow(
      topComp.find(AppLoader).prop('children')({ shouldLoad: true })
    );
    expect(insideAppLoaderLoading.find(Route).length).toBe(0);
  });
});
