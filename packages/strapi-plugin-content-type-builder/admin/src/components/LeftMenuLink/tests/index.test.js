import React from 'react';
import { shallow } from 'enzyme';
import { FormattedMessage } from 'react-intl';

import { LeftMenuLink } from '../index';

const props = {
  to: '/',
  name: 'link',
};

describe('<LeftMenuLink />', () => {
  it('should not crash', () => {
    shallow(<LeftMenuLink {...props} />);
  });

  it('should add a not saved span if the isTemporary prop is true', () => {
    const renderedComponent = shallow(<LeftMenuLink {...props} isTemporary />);
    const isTemporaryInfo = renderedComponent.find(FormattedMessage).first();

    expect(isTemporaryInfo.exists()).toBe(true);

    const insideCompo = shallow(isTemporaryInfo.prop('children')());

    expect(insideCompo.find('span').length).toBe(1);
  });
});
