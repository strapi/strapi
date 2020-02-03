import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';
import { IntlProvider } from 'react-intl';

import translationMessages from '../../../translations/en.json';

import Inputs from '../index';

const renderWithIntl = (Compo, props) => {
  return renderer.create(
    <IntlProvider locale="en" messages={translationMessages}>
      <Compo {...props} />
    </IntlProvider>
  );
};

describe('<Inputs />', () => {
  const props = {
    name: 'events',
    value: ['media.create, media.delete'],
    onChange: jest.fn(),
    type: 'events',
  };

  it('should not crash', () => {
    shallow(<Inputs {...props} />);
  });

  it('should match the snapshot if type is events', () => {
    const tree = renderWithIntl(Inputs, props);

    expect(tree).toMatchSnapshot();
  });

  it('should match the snapshot if type is headers', () => {
    const tree = renderWithIntl(Inputs, { ...props, type: 'headers' });

    expect(tree).toMatchSnapshot();
  });
});
