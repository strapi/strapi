import React from 'react';
import { shallow } from 'enzyme';
import { FormattedMessage } from 'react-intl';

import { ListRow } from '../index';
import StyledListRow from '../StyledListRow';

describe('<ListRow />', () => {
  const props = {
    attributeId: 'role',
    configurable: false,
    name: 'role',
    onClick: jest.fn(),
    onClickDelete: jest.fn(),
    plugin: 'users-permissions',
    target: 'role',
    type: 'string',
  };

  it('should not crash', () => {
    shallow(<ListRow {...props} />);
  });

  it("should show the origin of the feature if it's comming from a plugin", () => {
    const wrapper = shallow(<ListRow {...props} />);
    const insideCompo = shallow(
      wrapper
        .find(FormattedMessage)
        .last()
        .prop('children')()
    );

    expect(insideCompo.text()).toContain('users-permissions');
  });

  it("should not show the origin of the feature if it's not comming from a plugin", () => {
    props.plugin = null;

    const wrapper = shallow(<ListRow {...props} />);
    const insideCompo = shallow(
      wrapper
        .find(FormattedMessage)
        .last()
        .prop('children')()
    );

    expect(insideCompo.text().trim()).toEqual('Role');
  });

  it('should match the <number> type with the number icon', () => {
    props.type = 'biginteger';

    const wrapper = shallow(<ListRow {...props} />);
    const img = wrapper.find('img').first();

    expect(img.props('alt')).toBeDefined();
    expect(img.prop('alt')).toBe('icon-number');
  });

  it('should not call the onClick prop with the correct data if it is not configurable', () => {
    props.type = 'string';

    const wrapper = shallow(<ListRow {...props} />);
    const row = wrapper.find(StyledListRow);
    row.simulate('click');

    expect(props.onClick).not.toHaveBeenCalled();
  });

  it('should call the onClick prop with the correct data if it is configurable', () => {
    props.configurable = true;

    const wrapper = shallow(<ListRow {...props} />);
    const row = wrapper.find(StyledListRow);
    row.simulate('click');

    expect(props.onClick).toHaveBeenCalledWith('role', 'string');
  });

  it('should call the onClickDelete prop with the correct data if it is configurable', () => {
    props.configurable = true;

    const wrapper = shallow(<ListRow {...props} />);
    const deleteBtn = wrapper.find('button').last();
    deleteBtn.simulate('click', {
      stopPropagation: () => {},
    });

    expect(props.onClickDelete).toHaveBeenCalledWith('role');
  });

  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick, onClickDelete },
    } = ListRow;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
    expect(onClickDelete).toBeDefined();
    expect(onClickDelete()).toBe(undefined);
  });
});
