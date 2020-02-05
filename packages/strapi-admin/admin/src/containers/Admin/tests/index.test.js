import React from 'react';
import { shallow } from 'enzyme';

import { OverlayBlocker } from 'strapi-helper-plugin';
import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
  updatePlugin,
} from '../../App/actions';

import { Admin, mapDispatchToProps } from '../index';
import { setAppError } from '../actions';

describe('<Admin />', () => {
  let props;

  beforeEach(() => {
    props = {
      admin: {
        appError: false,
      },
      disableGlobalOverlayBlocker: jest.fn(),
      emitEvent: jest.fn(),
      enableGlobalOverlayBlocker: jest.fn(),
      global: {
        autoReload: false,
        blockApp: false,
        currentEnvironment: 'development',
        hasAdminUser: false,
        hasUserPlugin: true,
        isLoading: true,
        overlayBlockerData: null,
        plugins: {},
        showGlobalAppBlocker: true,
        strapiVersion: '3',
        uuid: false,
      },
      intl: {
        formatMessage: jest.fn(),
      },
      location: {},
      setAppError: jest.fn(),
      showGlobalAppBlocker: jest.fn(),
      updatePlugin: jest.fn(),
    };
  });

  it('should not crash', () => {
    shallow(<Admin {...props} />);
  });

  describe('render', () => {
    it('should display the OverlayBlocker if blockApp and showGlobalOverlayBlocker are true', () => {
      const globalProps = Object.assign(props.global, {
        blockApp: true,
        isAppLoading: false,
      });
      props.admin.isLoading = false;
      const renderedComponent = shallow(<Admin {...props} {...globalProps} />);

      expect(renderedComponent.find(OverlayBlocker)).toHaveLength(1);
    });
  });

  describe('HasApluginNotReady instance', () => {
    it('should return true if a plugin is not ready', () => {
      props.global.plugins = {
        test: { isReady: true, initializer: () => null, id: 'test' },
        other: { isReady: false, initializer: () => null, id: 'other' },
      };

      const wrapper = shallow(<Admin {...props} />);
      const { hasApluginNotReady } = wrapper.instance();

      expect(hasApluginNotReady(props)).toBeTruthy();
    });

    it('should return false if all plugins are ready', () => {
      props.global.plugins = {
        test: { isReady: true },
        other: { isReady: true },
      };

      const wrapper = shallow(<Admin {...props} />);
      const { hasApluginNotReady } = wrapper.instance();

      expect(hasApluginNotReady(props)).toBeFalsy();
    });
  });

  describe('renderRoute instance', () => {
    it('should render the routes', () => {
      const renderedComponent = shallow(<Admin {...props} />);
      const { renderRoute } = renderedComponent.instance();

      expect(renderRoute({}, () => null)).not.toBeNull();
    });
  });

  describe('renderInitializers', () => {
    it('should render the plugins initializer components', () => {
      const Initializer = () => <div>Initializer</div>;

      props.admin.isLoading = false;
      props.global.plugins = {
        test: {
          initializer: Initializer,
          isReady: false,
          id: 'test',
        },
      };

      const wrapper = shallow(<Admin {...props} />);

      expect(wrapper.find(Initializer)).toHaveLength(1);
    });
  });

  describe('renderPluginDispatcher instance', () => {
    it('should return the pluginDispatcher component', () => {
      const renderedComponent = shallow(<Admin {...props} />);
      const { renderPluginDispatcher } = renderedComponent.instance();

      expect(renderPluginDispatcher()).not.toBeNull();
    });
  });
});

describe('<Admin />, mapDispatchToProps', () => {
  describe('disableGlobalOverlayBlocker', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.disableGlobalOverlayBlocker).toBeDefined();
    });

    it('should dispatch the disableGlobalOverlayBlocker action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.disableGlobalOverlayBlocker();

      expect(dispatch).toHaveBeenCalledWith(disableGlobalOverlayBlocker());
    });
  });

  describe('enableGlobalOverlayBlocker', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.enableGlobalOverlayBlocker).toBeDefined();
    });

    it('should dispatch the enableGlobalOverlayBlocker action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.enableGlobalOverlayBlocker();

      expect(dispatch).toHaveBeenCalledWith(enableGlobalOverlayBlocker());
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

  describe('updatePlugin', () => {
    it('should be injected', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result.updatePlugin).toBeDefined();
    });

    it('should dispatch the updatePlugin action when called', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);
      result.updatePlugin();

      expect(dispatch).toHaveBeenCalledWith(updatePlugin());
    });
  });
});
