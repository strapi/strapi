import React from 'react';
import { shallow } from 'enzyme';
import { FormattedMessage } from 'react-intl';

import LeftMenuLink from '../index';

describe('<LeftMenuLink />', () => {
  it('Should not crash', () => {
    shallow(<LeftMenuLink />);
  });

  it('should add a span containing from:<source /> if a source prop is given', () => {
    const renderedComponent = shallow(<LeftMenuLink to="" name="test" source="source" />);
    const sourceInfo = renderedComponent.find(FormattedMessage).first();

    expect(sourceInfo.exists()).toBe(true);

    const insideCompo = shallow(sourceInfo.prop('children')());

    expect(insideCompo.find('span').length).toBe(1);
  });

  it('should add a not saved span if the isTemporary prop is true', () => {
    const renderedComponent = shallow(<LeftMenuLink to="" name="test" isTemporary />);
    const isTemporaryInfo = renderedComponent.find(FormattedMessage).first();

    expect(isTemporaryInfo.exists()).toBe(true);

    const insideCompo = shallow(isTemporaryInfo.prop('children')());

    expect(insideCompo.find('span').length).toBe(1);
  });
});
