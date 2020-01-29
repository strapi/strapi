import React from 'react';
import renderer from 'react-test-renderer';

import EventRow from '../EventRow';

describe('<EventRow />', () => {
  const props = {
    name: 'events',
  };

  it('should match the snapshot', () => {
    const tree = renderer.create(<EventRow {...props} />).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('should have default handleChange', () => {
    expect(EventRow.defaultProps.handleChange).toBeDefined();
  });

  it('should have default handleChangeAll', () => {
    expect(EventRow.defaultProps.handleChangeAll).toBeDefined();
  });
});
