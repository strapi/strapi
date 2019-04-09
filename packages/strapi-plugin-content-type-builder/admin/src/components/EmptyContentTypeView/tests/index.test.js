import React from 'react';
import { shallow } from 'enzyme';

import EmptyContentTypeView from '../index';

describe('<EmptyContentTypeView />', () => {
  it('should not crash', () => {
    const handleButtonClick = jest.fn();

    shallow(<EmptyContentTypeView handleButtonClick={handleButtonClick} />);
  });
});
