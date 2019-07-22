import React from 'react';
import Enzyme from 'enzyme';

import FeaturePicker from '../index';

describe('<FeaturePicker />', () => {
  let wrapper;
  const setOpen = jest.fn();
  const useStateSpy = jest.spyOn(React, 'useState');
  useStateSpy.mockImplementation(init => [init, setOpen]);

  beforeEach(() => {
    wrapper = Enzyme.shallow(<FeaturePicker />);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SetOpen', () => {
    it('calls setOpen with true param', () => {
      const buttonProps = wrapper.find('button').props();

      buttonProps.onClick();
      expect(setOpen).toHaveBeenCalledWith(true);
    });
  });
});
