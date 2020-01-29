import React from 'react';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';

import EventInput from '../index';

describe('<EventInput />', () => {
  const props = {
    name: 'events',
    value: ['media.create, media.delete'],
    onChange: jest.fn(),
  };

  it('should render properly', () => {
    const tree = renderer.create(
      <IntlProvider locale="en">
        <EventInput {...props} />
      </IntlProvider>
    );

    expect(tree).toMatchSnapshot();
  });
});
