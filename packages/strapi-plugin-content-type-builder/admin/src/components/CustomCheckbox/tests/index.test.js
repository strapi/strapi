import React from 'react';

import InputNumber from 'components/InputNumberWithErrors';

import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import CustomCheckbox from '../index';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);
const renderComponent = (props = {}) => mountWithIntl(<CustomCheckbox {...props} />, messages);

describe('<CustomCheckbox />', () => {
  let props;

  beforeEach(() => {
    props = {
      name: 'test',
      onChange: jest.fn(),
      value: null,
    };
  });
  it('should not crash', () => {
    renderComponent(props);
  });

  it('should have the isChecked state true if a value is given', () => {
    props.value = 1;
    const wrapper = renderComponent(props);

    expect(wrapper.state('isChecked')).toBeTruthy();
    expect(wrapper.find(InputNumber)).toHaveLength(1);

    wrapper.unmount();
  });

  it('should have the isChecked state false if a value is given', () => {
    const wrapper = renderComponent(props);

    expect(wrapper.state('isChecked')).toBeFalsy();
    expect(wrapper.find(InputNumber)).toHaveLength(0);

    wrapper.unmount();
  });

  it('should not display the InputNumber if the state isChecked is false', () => {
    const wrapper = renderComponent(props);

    expect(wrapper.find(InputNumber)).toHaveLength(0);

    wrapper.unmount();
  });

  it('should work', () => {
    const wrapper = renderComponent(props);
    const spyOnHandleChange = jest.spyOn(wrapper.instance(), 'handleChange');
    const spyOnHandleChangeNumber = jest.spyOn(wrapper.instance(), 'handleInputNumberChange');
    wrapper.instance().forceUpdate();

    const input = wrapper.find('input').first();

    expect(wrapper.state('isChecked')).toBeFalsy();
    input.simulate('change', { target: { checked: true } });

    expect(spyOnHandleChange).toHaveBeenCalled();
    expect(wrapper.state('isChecked')).toBeTruthy();

    const inputNumber = wrapper.find(InputNumber);

    inputNumber.prop('onChange')({ target: { name: 'test', value: '1' } });

    expect(props.onChange).toHaveBeenCalledWith({ target: { name: 'test', type: 'number', value: 1 } });
    expect(spyOnHandleChangeNumber).toHaveBeenCalled();

    input.simulate('change', { target: { checked: false } });
    expect(spyOnHandleChange).toHaveBeenCalled();
    expect(props.onChange).toHaveBeenCalledWith({ target: { name: 'test', value: null } });

    wrapper.unmount();
  });
});
