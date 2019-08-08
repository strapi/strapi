import React from 'react';
import { shallow } from 'enzyme';

import { RelationBox } from '../index';
import { InputTextWithErrors as InputText } from 'strapi-helper-plugin';

describe('<RelationBox />', () => {
  let props;

  beforeEach(() => {
    props = {
      isMain: false,
      onChange: jest.fn(),
      value: '',
    };
  });

  it('should not crash', () => {
    shallow(<RelationBox {...props} />);
  });

  it('should use the defaultProps', () => {
    const {
      defaultProps: { onClick },
    } = RelationBox;

    expect(onClick).toBeDefined();
    expect(onClick()).toBe(undefined);
  });

  it('should display source if it exists', () => {
    props.isMain = true;
    props.source = 'users-permissions';

    const wrapper = shallow(<RelationBox {...props} />);

    const span = wrapper
      .find('p')
      .at(0)
      .find('span');

    expect(span.text()).toContain('users-permissions');
  });

  it("should return '-' for the target's value if the nature is either oneWay or manyWay", () => {
    props.nature = 'oneWay';
    const wrapper = shallow(<RelationBox {...props} />);
    const { value } = wrapper.find(InputText).props();

    expect(value).toBe('-');

    props.nature = 'manyWay';
    expect(value).toBe('-');
  });
});
