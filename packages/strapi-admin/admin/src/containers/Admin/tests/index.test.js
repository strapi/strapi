import React from 'react';
import { shallow } from 'enzyme';

import { Admin, mapDispatchToProps } from '../index';
import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from '../actions';

describe('<Admin />', () => {
  it('should not crash', () => {
    shallow(<Admin />);
  });
});

describe('<Admin />, mapDispatchToProps', () => {
  describe('getInitData', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.getInitData).toBeDefined();
    });

    it('should dispatch the getInitData action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.getInitData();

      expect(dispatch).toHaveBeenCalledWith(getInitData());
    });
  });

  describe('hideLeftMenu', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.hideLeftMenu).toBeDefined();
    });

    it('should dispatch the hideLeftMenu action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.hideLeftMenu();

      expect(dispatch).toHaveBeenCalledWith(hideLeftMenu());
    });
  });

  describe('setAppError', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.setAppError).toBeDefined();
    });

    it('should dispatch the setAppError action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.setAppError();

      expect(dispatch).toHaveBeenCalledWith(setAppError());
    });
  });

  describe('showLeftMenu', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.showLeftMenu).toBeDefined();
    });

    it('should dispatch the showLeftMenu action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.showLeftMenu();

      expect(dispatch).toHaveBeenCalledWith(showLeftMenu());
    });
  });
});
