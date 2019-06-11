import React from 'react';
import { shallow } from 'enzyme';
import { FormattedMessage } from 'react-intl';

import LeftMenuLink from '../index';

describe('<LeftMenuLink />', () => {
  const props = {
    to: '/',
    name: 'link',
  };
  it('should not crash', () => {
    shallow(<LeftMenuLink {...props} />);
  });
  it('should add a span containing from:<source /> if a source prop is given', () => {
    const renderedComponent = shallow(
      <LeftMenuLink {...props} source="source" />
    );
    const sourceInfo = renderedComponent.find(FormattedMessage).first();

    expect(sourceInfo.exists()).toBe(true);

    const insideCompo = shallow(sourceInfo.prop('children')());

    expect(insideCompo.find('span').length).toBe(1);
  });

  it('should add a not saved span if the isTemporary prop is true', () => {
    const renderedComponent = shallow(<LeftMenuLink {...props} isTemporary />);
    const isTemporaryInfo = renderedComponent.find(FormattedMessage).first();

    expect(isTemporaryInfo.exists()).toBe(true);

    const insideCompo = shallow(isTemporaryInfo.prop('children')());

    expect(insideCompo.find('span').length).toBe(1);
  });
});
