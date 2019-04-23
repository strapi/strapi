import React from 'react';
import { shallow } from 'enzyme';
import { BlockerComponent } from 'strapi-helper-plugin';
import { PluginDispatcher } from '../index';

const BlockerComponent2 = () => <div>BlockerComponent</div>;
const Email = () => <div>Email Plugin</div>;

describe('<PluginDispatcher />', () => {
  it('Should return null if the params does not match the pluginId', () => {
    const props = {
      global: { plugins: {} },
      match: { params: { pluginId: 'email' } },
    };

    const rendered = shallow(<PluginDispatcher {...props} />);

    expect(rendered.children()).toHaveLength(0);
  });

  it('Should return the BlockerComponent if the plugin preventRendering prop is true', () => {
    const props = {
      global: {
        plugins: {
          email: {
            mainComponent: Email,
            preventComponentRendering: true,
            blockerComponent: null,
          },
        },
      },
      match: { params: { pluginId: 'email' } },
    };

    const renderedComponent = shallow(<PluginDispatcher {...props} />);

    expect(renderedComponent.find(BlockerComponent)).toHaveLength(1);
  });

  it('Should return a custom BlockerComponent if the plugin preventRendering prop is true and a custom blocker is given', () => {
    const props = {
      global: {
        plugins: {
          email: {
            mainComponent: Email,
            preventComponentRendering: true,
            blockerComponent: BlockerComponent2,
          },
        },
      },
      match: { params: { pluginId: 'email' } },
    };

    const renderedComponent = shallow(<PluginDispatcher {...props} />);

    expect(renderedComponent.find(BlockerComponent2)).toHaveLength(1);
  });

  it('Should return the plugin\'s mainComponent if all conditions are met', () => {
    const props = {
      global: {
        plugins: {
          email: {
            mainComponent: Email,
          },
        },
      },
      match: { params: { pluginId: 'email' } },
    };

    const renderedComponent = shallow(<PluginDispatcher {...props} />);

    expect(renderedComponent.find(Email)).toHaveLength(1);
  });
});
