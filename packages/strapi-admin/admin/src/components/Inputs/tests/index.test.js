import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';
import { IntlProvider } from 'react-intl';

import Inputs from '../index';

describe('<Inputs />', () => {
  const props = {
    name: 'events',
    value: ['media.create, media.delete'],
    onChange: jest.fn(),
  };

  it('should not crash', () => {
    shallow(<Inputs {...props} />);
  });

  it('should render properly', () => {
    const tree = renderer.create(
      <IntlProvider locale="en">
        <Inputs {...props} />
      </IntlProvider>
    );

    expect(tree).toMatchSnapshot();
  });
});
