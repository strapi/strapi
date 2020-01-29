import React from 'react';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';

import translationMessages from '../../../translations/en.json';

import EventInput from '../index';

describe('<EventInput />', () => {
  const props = {
    name: 'events',
    value: ['media.create, media.delete'],
    onChange: jest.fn(),
  };

  it('should match the snapshot', () => {
    const tree = renderer.create(
      <IntlProvider locale="en" messages={translationMessages}>
        <EventInput {...props} />
      </IntlProvider>
    );

    expect(tree).toMatchSnapshot();
  });
});
