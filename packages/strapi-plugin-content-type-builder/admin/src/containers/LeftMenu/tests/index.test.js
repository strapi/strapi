import React from 'react';
import formatMessagesWithPluginId from 'testUtils/formatMessages';
import pluginTradsEn from '../../../translations/en.json';
import { BrowserRouter } from 'react-router-dom';

import MenuContext from '../../MenuContext';
// import LeftMenuLink from '../../../components/LeftMenuLink';
import LeftMenu from '../index';

import { LeftMenuList } from 'strapi-helper-plugin';

import pluginId from '../../../pluginId';
import mountWithIntl from 'testUtils/mountWithIntl';

// @soupette
// TODO update the test when switching to react testing lib
const renderCompo = (context = { models: [] }) => (
  <MenuContext value={context}>
    <LeftMenu />
  </MenuContext>
);

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);

const context = { emitEvent: jest.fn() };

const menuContext = {
  canOpenModal: true,
  models: [
    {
      icon: 'fa-cube',
      name: 'role',
      description: '',
      fields: 6,
      source: 'users-permissions',
      isTemporary: false,
    },
    {
      icon: 'fa-cube',
      name: 'product',
      description: 'super api',
      fields: 6,
      isTemporary: false,
    },
    {
      icon: 'fa-cube',
      name: 'test1',
      description: 'super api',
      fields: 6,
      isTemporary: true,
    },
  ],
  groups: [
    {
      uid: 'ingredients',
      name: 'Ingredients',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'ingredients',
        description: 'Little description',
        attributes: {
          name: {
            type: 'string',
            required: true,
          },
          quantity: {
            type: 'float',
            required: true,
          },
          picture: {
            model: 'file',
            via: 'related',
            plugin: 'upload',
          },
        },
      },
    },
    {
      uid: 'fruits',
      name: 'Fruits',
      source: null,
      schema: {
        connection: 'default',
        collectionName: 'ingredients',
        description: 'Little description',
        attributes: {
          name: {
            type: 'string',
            required: true,
          },
          quantity: {
            type: 'float',
            required: true,
          },
          picture: {
            model: 'file',
            via: 'related',
            plugin: 'upload',
          },
        },
      },
    },
  ],
  push: jest.fn(),
};

const renderComponent = () => {
  return mountWithIntl(
    <BrowserRouter>
      <MenuContext.Provider value={menuContext}>
        <LeftMenu />
      </MenuContext.Provider>
    </BrowserRouter>,
    messages,
    context
  );
};

describe('CTB <LeftMenu />', () => {
  it('Should not crash', () => {
    renderCompo(context);
  });
  describe('<LeftMenu /> lifecycle', () => {
    let topCompo;
    afterEach(() => {
      topCompo.unmount();
    });

    describe('Render links', () => {
      it('should render 2 lists in the menu', () => {
        topCompo = renderComponent();
        const links = topCompo.find(LeftMenuList);

        expect(links).toHaveLength(2);
      });
    });
  });
});
