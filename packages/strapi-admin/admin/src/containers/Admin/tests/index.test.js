import React from 'react';
import { shallow } from 'enzyme';
import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from '../../LocaleToggle/actions';

import Header from '../../../components/Header/index';

import { Admin, mapDispatchToProps } from '../index';
import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from '../actions';

import styles from '../styles.scss';

describe('<Admin />', () => {
  let props;

  beforeEach(() => {
    props = {
      admin: {
        autoReload: false,
        appError: false,
        currentEnvironment: 'development',
        isLoading: true,
        layout: {},
        showLeftMenu: true,
        strapiVersion: '3',
        uuid: false,
      },
      global: {
        appPlugins: [],
        blockApp: false,
        overlayBlockerData: null,
        hasUserPlugin: true,
        isAppLoading: true,
        plugins: {},
        showGlobalAppBlocker: true,
      },
    };
  });
 
  it('should not crash', () => {
    shallow(<Admin {...props} />);
  });

  describe('render', () => {
    it('should not display the header if the showLeftMenu prop is false', () => {
      const adminProps = Object.assign(props.admin, { showLeftMenu: false });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);

      expect(renderedComponent.find(Header)).toHaveLength(0);
    });
  });

  describe('getContentWrapperStyle instance', () => {
    it('should return an empty object for the main key if showLeftMenu prop is true', () => {
      const renderedComponent = shallow(<Admin {...props} />);
      const { getContentWrapperStyle } = renderedComponent.instance();
      const expected = { main: {}, sub: styles.content };

      expect(getContentWrapperStyle()).toEqual(expected);  
    });

    it('should not return an empty object for the main key if showLeftMenu prop is true', () => {
      const adminProps = Object.assign(props.admin, { showLeftMenu: false });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);
      const { getContentWrapperStyle } = renderedComponent.instance();
      const expected = { main: { width: '100%' }, sub: styles.wrapper };

      expect(getContentWrapperStyle()).toEqual(expected);
    });
  });

  describe('isAcceptingTracking instance', () => {
    it('should return false if the uuid prop is false', () => {
      const renderedComponent = shallow(<Admin {...props} />);
      const { isAcceptingTracking } = renderedComponent.instance();

      expect(isAcceptingTracking()).toEqual(false);
    });

    it('should return false if the uuid prop is null', () => {
      const adminProps = Object.assign(props.admin, { uuid: null });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);
      const { isAcceptingTracking } = renderedComponent.instance();

      expect(isAcceptingTracking()).toEqual(false);
    });

    it('should return false if the uuid prop is true', () => {
      const adminProps = Object.assign(props.admin, { uuid: true });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);
      const { isAcceptingTracking } = renderedComponent.instance();

      expect(isAcceptingTracking()).toEqual(true);
    });

    it('should return false if the uuid prop is a string', () => {
      const adminProps = Object.assign(props.admin, { uuid: 'uuid' });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);
      const { isAcceptingTracking } = renderedComponent.instance();

      expect(isAcceptingTracking()).toEqual(true);
    });
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

  describe('resetLocaleDefaultClassName', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.resetLocaleDefaultClassName).toBeDefined();
    });

    it('should dispatch the resetLocaleDefaultClassName action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.resetLocaleDefaultClassName();

      expect(dispatch).toHaveBeenCalledWith(resetLocaleDefaultClassName());
    });
  });

  describe('setLocaleCustomClassName', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.setLocaleCustomClassName).toBeDefined();
    });

    it('should dispatch the setLocaleCustomClassName action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.setLocaleCustomClassName();

      expect(dispatch).toHaveBeenCalledWith(setLocaleCustomClassName());
    });
  });
});
