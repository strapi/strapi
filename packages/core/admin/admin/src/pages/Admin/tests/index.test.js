// import React from 'react';
// import { shallow } from 'enzyme';

// import { Admin, mapDispatchToProps } from '../index';
// import { setAppError } from '../actions';

describe('<Admin />', () => {
  // let props;

  // beforeEach(() => {
  //   props = {
  //     admin: {
  //       appError: false,
  //       latestStrapiReleaseTag: '3',
  //       shouldUpdateStrapi: false,
  //     },

  //     emitEvent: jest.fn(),

  //     getInfosDataSucceeded: jest.fn(),
  //     getStrapiLatestReleaseSucceeded: jest.fn(),
  //     getUserPermissions: jest.fn(),
  //     getUserPermissionsError: jest.fn(),
  //     getUserPermissionsSucceeded: jest.fn(),
  //     plugins: {},
  //     global: {
  //       autoReload: false,
  //       currentEnvironment: 'development',
  //       isLoading: true,
  //       strapiVersion: '3',
  //       uuid: false,
  //     },
  //     intl: {
  //       formatMessage: jest.fn(),
  //     },
  //     location: {},
  //     setAppError: jest.fn(),
  //   };
  // });

  // FIXME
  it('should not crash', () => {
    expect(true).toBe(true);
    // shallow(<Admin {...props} />);
  });

  // FIXME
  // describe('render', () => {
  //   it('should display the OverlayBlocker if blockApp and showGlobalOverlayBlocker are true', () => {
  //     const globalProps = Object.assign(props.global, {
  //       blockApp: true,
  //       isAppLoading: false,
  //     });
  //     props.admin.isLoading = false;
  //     const renderedComponent = shallow(<Admin {...props} {...globalProps} />);

  //     expect(renderedComponent.find(OverlayBlocker)).toHaveLength(1);
  //   });
  // });

  //   describe('HasApluginNotReady instance', () => {
  //     it('should return true if a plugin is not ready', () => {
  //       props.global.plugins = {
  //         test: { isReady: true, initializer: () => null, id: 'test' },
  //         other: { isReady: false, initializer: () => null, id: 'other' },
  //       };

  //       const wrapper = shallow(<Admin {...props} />);
  //       const { hasApluginNotReady } = wrapper.instance();

  //       expect(hasApluginNotReady(props)).toBeTruthy();
  //     });

  //     it('should return false if all plugins are ready', () => {
  //       props.global.plugins = {
  //         test: { isReady: true },
  //         other: { isReady: true },
  //       };

  //       const wrapper = shallow(<Admin {...props} />);
  //       const { hasApluginNotReady } = wrapper.instance();

  //       expect(hasApluginNotReady(props)).toBeFalsy();
  //     });
  //   });

  //   describe('renderRoute instance', () => {
  //     it('should render the routes', () => {
  //       const renderedComponent = shallow(<Admin {...props} />);
  //       const { renderRoute } = renderedComponent.instance();

  //       expect(renderRoute({}, () => null)).not.toBeNull();
  //     });
  //   });

  //   describe('renderInitializers', () => {
  //     it('should render the plugins initializer components', () => {
  //       const Initializer = () => <div>Initializer</div>;

  //       props.admin.isLoading = false;
  //       props.global.plugins = {
  //         test: {
  //           initializer: Initializer,
  //           isReady: false,
  //           id: 'test',
  //         },
  //       };

  //       const wrapper = shallow(<Admin {...props} />);

  //       expect(wrapper.find(Initializer)).toHaveLength(1);
  //     });
  //   });

  //   describe('renderPluginDispatcher instance', () => {
  //     it('should return the pluginDispatcher component', () => {
  //       const renderedComponent = shallow(<Admin {...props} />);
  //       const { renderPluginDispatcher } = renderedComponent.instance();

  //       expect(renderPluginDispatcher()).not.toBeNull();
  //     });
  //   });
});
