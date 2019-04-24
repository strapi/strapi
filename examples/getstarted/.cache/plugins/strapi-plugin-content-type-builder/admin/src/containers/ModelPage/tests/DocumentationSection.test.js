import React from 'react';
import { FormattedMessage } from 'react-intl';
import { shallow } from 'enzyme';

import DocumentationSection from '../DocumentationSection';

describe('<DocumentationSection />', () => {
  it('should not crash', () => {
    shallow(<DocumentationSection />);
  });

  it('should render a link', () => {
    const wrapper = shallow(<DocumentationSection />);
    const insideCompo = shallow(wrapper.find(FormattedMessage).at(1).prop('children')());

    expect(insideCompo.find('a')).toHaveLength(1);
  });
});
