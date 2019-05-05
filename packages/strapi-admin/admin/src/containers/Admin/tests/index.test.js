import React from 'react';
import { mount, shallow } from 'enzyme';

import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { compose } from 'redux';

import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
  updatePlugin,
} from '../../App/actions';

import { LoadingIndicatorPage, OverlayBlocker } from 'strapi-helper-plugin';

import injectReducer from '../../../utils/injectReducer';
import history from '../../../utils/history';
import configureStore from '../../../configureStore';
import messages from 'testUtils/commonTrads.json';

import Header from '../../../components/Header/index';
import Onboarding from '../../Onboarding';
import Logout from '../../../components/Logout';

import localeToggleReducer from '../../LocaleToggle/reducer';

import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from '../../LocaleToggle/actions';

import { Admin, mapDispatchToProps } from '../index';
import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from '../actions';

import styles from '../styles.scss';

const initialState = {};
const store = configureStore(initialState, history);

const withLocaleToggleReducer = injectReducer({
  key: 'localeToggle',
  reducer: localeToggleReducer,
});
const WithAdmin = compose(withLocaleToggleReducer)(Admin);

const renderComponent = properties =>
  mount(
    React.createElement(
      props => (
        <Provider store={store}>
          <IntlProvider locale="en" defaultLocale="en" messages={messages}>
            <Router>
              <WithAdmin store={store} {...props} />
            </Router>
          </IntlProvider>
        </Provider>
      ),
      properties,
    ),
  );

describe('<Admin />, (with Redux), React lifecycle', () => {
  let props;

  beforeEach(() => {
    props = {
      admin: {
        autoReload: false,
        appError: false,
        currentEnvironment: 'development',
        didGetSecuredData: false,
        isLoading: true,
        isSecured: false,
        layout: {},
        showLogoutComponent: false,
        showMenu: true,
        securedData: {},
        strapiVersion: '3',
        uuid: false,
      },
      disableGlobalOverlayBlocker: jest.fn(),
      emitEvent: jest.fn(),
      enableGlobalOverlayBlocker: jest.fn(),
      getInitData: jest.fn(),
      getSecuredData: jest.fn(),
      getHook: jest.fn(),
      global: {
        appPlugins: [],
        blockApp: false,
        overlayBlockerData: null,
        hasUserPlugin: true,
        isAppLoading: true,
        plugins: {},
        showGlobalAppBlocker: true,
      },
      localeToggle: {},
      hideLeftMenu: jest.fn(),
      hideLogout: jest.fn(),
      location: {},
      resetLocaleDefaultClassName: jest.fn(),
      setAppError: jest.fn(),
      setAppSecured: jest.fn(),
      showLeftMenu: jest.fn(),
      showLogout: jest.fn(),
      showGlobalAppBlocker: jest.fn(),
      unsetAppSecured: jest.fn(),
      updatePlugin: jest.fn(),
    };
  });

  it('should not crash when mounted', () => {
    renderComponent(props);
  });

  describe('ComponentDidUpdate', () => {
    it('should call the getSecuredData if the app is secured', () => {
      const wrapper = renderComponent(props);

      expect(props.getSecuredData).not.toHaveBeenCalled();

      wrapper.setProps({
        admin: { isSecured: true },
      });

      expect(props.getSecuredData).toHaveBeenCalled();

      wrapper.unmount();
    });

    it('should call the getHook props with the willSecure arg if the pathname has changed', () => {
      props.admin.isLoading = false;
      props.global.isAppLoading = false;

      const renderedComponent = renderComponent(props);
      renderedComponent.setProps({
        admin: { isLoading: false },
        location: { pathname: '/admin/marketPlace' },
      });

      expect(props.getHook).toHaveBeenCalledWith('willSecure');

      renderedComponent.unmount();
    });

    it('should emit the didGetSecured hook event when the secured data has been retrieved', () => {
      const wrapper = renderComponent(props);

      expect(props.getHook).not.toHaveBeenCalled();

      wrapper.setProps({
        admin: { didGetSecuredData: true },
      });

      expect(props.getHook).toHaveBeenCalledWith('didGetSecuredData');

      wrapper.unmount();
    });
  });
});

describe('<Admin />', () => {
  let props;

  beforeEach(() => {
    props = {
      admin: {
        autoReload: false,
        appError: false,
        currentEnvironment: 'development',
        didGetSecuredData: false,
        isLoading: true,
        isSecured: false,
        layout: {},
        securedData: {},
        showLogoutComponent: false,
        showMenu: true,
        strapiVersion: '3',
        uuid: false,
      },
      disableGlobalOverlayBlocker: jest.fn(),
      emitEvent: jest.fn(),
      enableGlobalOverlayBlocker: jest.fn(),
      getInitData: jest.fn(),
      getHook: jest.fn(),
      getSecuredData: jest.fn(),
      global: {
        appPlugins: [],
        blockApp: false,
        overlayBlockerData: null,
        hasUserPlugin: true,
        isAppLoading: true,
        plugins: {},
        showGlobalAppBlocker: true,
      },
      localeToggle: {},
      hideLeftMenu: jest.fn(),
      hideLogout: jest.fn(),
      location: {},
      resetLocaleDefaultClassName: jest.fn(),
      setAppError: jest.fn(),
      setAppSecured: jest.fn(),
      showLeftMenu: jest.fn(),
      showLogout: jest.fn(),
      showGlobalAppBlocker: jest.fn(),
      unsetAppSecured: jest.fn(),
      updatePlugin: jest.fn(),
    };
  });

  it('should not crash', () => {
    shallow(<Admin {...props} />);
  });

  describe('render', () => {
    it('should not display the header if the showMenu prop is false', () => {
      const adminProps = Object.assign(props.admin, {
        isLoading: false,
        showMenu: false,
      });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);

      expect(renderedComponent.find(Header)).toHaveLength(0);
    });

    it('should not display the Logout if the showLogoutComponent prop is false', () => {
      props.admin.isLoading = false;
      props.global.isAppLoading = false;
      const wrapper = shallow(<Admin {...props} />);

      expect(wrapper.find(Logout)).toHaveLength(0);
      expect(wrapper.find(Onboarding)).toHaveLength(0);
    });

    it('should  display the Logout if the showLogoutComponent prop is true', () => {
      props.admin.showLogoutComponent = true;
      props.admin.isLoading = false;
      props.global.isAppLoading = false;

      const wrapper = shallow(<Admin {...props} />);

      expect(wrapper.find(Logout)).toHaveLength(1);
      expect(wrapper.find(Onboarding)).toHaveLength(1);
    });

    it('should display the OverlayBlocker if blockApp and showGlobalOverlayBlocker are true', () => {
      const globalProps = Object.assign(props.global, {
        blockApp: true,
        isAppLoading: false,
      });
      props.admin.isLoading = false;
      const renderedComponent = shallow(<Admin {...props} {...globalProps} />);

      expect(renderedComponent.find(OverlayBlocker)).toHaveLength(1);
    });

    it('should display the LoadingIndicatorPage if the isLoading prop is true', () => {
      const renderedComponent = shallow(<Admin {...props} />);

      expect(renderedComponent.find(LoadingIndicatorPage)).toHaveLength(1);
    });
  });

  describe('HasApluginNotReady instance', () => {
    it('should return true if a plugin is not ready', () => {
      props.global.plugins = {
        test: { isReady: true },
        other: { isReady: false },
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

  describe('getContentWrapperStyle instance', () => {
    it('should return an empty object for the main key if showMenu prop is true', () => {
      const renderedComponent = shallow(<Admin {...props} />);
      const { getContentWrapperStyle } = renderedComponent.instance();
      const expected = { main: {}, sub: styles.content };

      expect(getContentWrapperStyle()).toEqual(expected);
    });

    it('should not return an empty object for the main key if showMenu prop is true', () => {
      const adminProps = Object.assign(props.admin, { showMenu: false });
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

    it('should return true if the uuid prop is true', () => {
      const adminProps = Object.assign(props.admin, { uuid: true });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);
      const { isAcceptingTracking } = renderedComponent.instance();

      expect(isAcceptingTracking()).toEqual(true);
    });

    it('should return true if the uuid prop is a string', () => {
      const adminProps = Object.assign(props.admin, { uuid: 'uuid' });
      const renderedComponent = shallow(<Admin {...props} {...adminProps} />);
      const { isAcceptingTracking } = renderedComponent.instance();

      expect(isAcceptingTracking()).toEqual(true);
    });
  });

  describe('renderMarketPlace instance', () => {
    it('should return the MarketPlace container', () => {
      const renderedComponent = shallow(<Admin {...props} />);
      const { renderMarketPlace } = renderedComponent.instance();

      expect(renderMarketPlace()).not.toBeNull();
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
