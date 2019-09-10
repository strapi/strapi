import React from 'react';
import { mount, shallow } from 'enzyme';

import Initializer from '../index';

describe('<Initializer />', () => {
  it('renders without crashing', () => {
    const props = {
      admin: {
        autoReload: true,
        currentEnvironment: 'development',
      },
      updatePlugin: jest.fn(),
    };

    const renderedComponent = shallow(<Initializer {...props} />);

    expect(renderedComponent.children()).toHaveLength(0);
  });

  it('should call the updatePlugin props to emit the event isReady with not prevent the component from being rendererd', () => {
    const updatePlugin = jest.fn();
    const props = {
      admin: {
        autoReload: true,
        currentEnvironment: 'development',
      },
      updatePlugin,
    };
    const blockerComponentProps = {
      blockerComponentTitle: 'components.AutoReloadBlocker.header',
      blockerComponentDescription: 'components.AutoReloadBlocker.description',
      blockerComponentIcon: 'fa-refresh',
      blockerComponentContent: 'renderIde',
    };

    mount(<Initializer {...props} />);

    expect(updatePlugin).toHaveBeenNthCalledWith(
      1,
      'content-type-builder',
      'preventComponentRendering',
      false,
    );
    expect(updatePlugin).toHaveBeenNthCalledWith(
      2,
      'content-type-builder',
      'blockerComponentProps',
      blockerComponentProps,
    );
    expect(updatePlugin).toHaveBeenNthCalledWith(3, 'content-type-builder', 'isReady', true);
  });

  it('should call the updatePlugin props to emit the event isReady with prevent the component from being rendererd if the autoReaload is disabled', () => {
    const updatePlugin = jest.fn();
    const props = {
      admin: {
        autoReload: false,
        currentEnvironment: 'development',
      },
      updatePlugin,
    };
    const blockerComponentProps = {
      blockerComponentTitle: 'components.AutoReloadBlocker.header',
      blockerComponentDescription: 'components.AutoReloadBlocker.description',
      blockerComponentIcon: 'fa-refresh',
      blockerComponentContent: 'renderIde',
    };

    mount(<Initializer {...props} />);

    expect(updatePlugin).toHaveBeenNthCalledWith(
      1,
      'content-type-builder',
      'preventComponentRendering',
      true,
    );
    expect(updatePlugin).toHaveBeenNthCalledWith(
      2,
      'content-type-builder',
      'blockerComponentProps',
      blockerComponentProps,
    );
    expect(updatePlugin).toHaveBeenNthCalledWith(3, 'content-type-builder', 'isReady', true);
  });

  it('should call the updatePlugin props to emit the event isReady with prevent the component from being rendererd if in PRODUCTION', () => {
    const updatePlugin = jest.fn();
    const props = {
      admin: {
        autoReload: true,
        currentEnvironment: 'production',
      },
      updatePlugin,
    };
    const blockerComponentProps = {
      blockerComponentTitle: 'components.ProductionBlocker.header',
      blockerComponentDescription: 'components.ProductionBlocker.description',
      blockerComponentIcon: 'fa-ban',
      blockerComponentContent: 'renderButton',
    };

    mount(<Initializer {...props} />);

    expect(updatePlugin).toHaveBeenNthCalledWith(
      1,
      'content-type-builder',
      'preventComponentRendering',
      true,
    );
    expect(updatePlugin).toHaveBeenNthCalledWith(
      2,
      'content-type-builder',
      'blockerComponentProps',
      blockerComponentProps,
    );
    expect(updatePlugin).toHaveBeenNthCalledWith(3, 'content-type-builder', 'isReady', true);
  });
});
