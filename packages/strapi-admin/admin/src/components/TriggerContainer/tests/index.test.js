import React from 'react';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import TriggerContainer from '../index';

describe('<TriggerContainer />', () => {
  const props = {
    isPending: false,
    onCancel: jest.fn(),
    response: {
      statusCode: 200,
      message: 'success',
    },
  };

  it('should match the snapshot', () => {
    const tree = renderer.create(
      <IntlProvider locale="en">
        <TriggerContainer {...props} />
      </IntlProvider>
    );

    expect(tree).toMatchSnapshot();
  });
});
