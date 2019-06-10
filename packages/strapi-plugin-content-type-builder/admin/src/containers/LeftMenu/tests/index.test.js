import React from 'react';
import MenuContext from '../../MenuContext';
import LeftMenu, { getSectionTitle } from '../index';

// @soupette
// TODO update the test when switching to react testing lib

const renderCompo = (context = { models: [] }) => (
  <MenuContext value={context}>
    <LeftMenu />
  </MenuContext>
);

describe('CTB <LeftMenu />', () => {
  it('Should not crash', () => {
    const context = {
      canOpenModal: true,
      models: [],
    };

    renderCompo(context);
  });

  it('should return a plural string for the user', () => {
    expect(getSectionTitle('model', [])).toContain('singular');
  });
});

// describe('<LeftMenu />', () => {
//   const defaultProps = {
//     menuItems: [
//       {
//         titleId: 'models',
//         links: [
//           {
//             icon: 'fa-cube',
//             name: 'role',
//             description: '',
//             fields: 6,
//             source: 'users-permissions',
//             isTemporary: false,
//           },
//           {
//             icon: 'fa-cube',
//             name: 'product',
//             description: 'super api',
//             fields: 6,
//             isTemporary: false,
//           },
//           {
//             icon: 'fa-cube',
//             name: 'test1',
//             description: 'super api',
//             fields: 6,
//             isTemporary: true,
//           },
//         ],
//       },
//       {
//         title: 'models',
//         links: [
//           {
//             icon: 'fa-cube',
//             name: 'permission',
//             description: '',
//             fields: 6,
//             source: 'users-permissions',
//             isTemporary: false,
//           },
//           {
//             icon: 'fa-cube',
//             name: 'user',
//             description: '',
//             fields: 6,
//             source: 'users-permissions',
//             isTemporary: false,
//           },
//         ],
//       },
//     ],
//   };
//   it('should not crash', () => {
//     shallow(<NavMenu />);
//   });

//   it('should render 5 links in the menu', () => {
//     const wrapper = shallow(<NavMenu {...defaultProps} />);
//     const links = wrapper.find(Link);

//     expect(links).toHaveLength(5);
//   });

//   it('should render links title as FormattedMessage element if titleId props exists', () => {
//     const wrapper = shallow(<NavMenu {...defaultProps} />);

//     expect(wrapper.find('section').find(FormattedMessage).prop('id')).toContain('models');
//   });

//   it('should render links title as string if titleId props does not exist', () => {
//     const wrapper = shallow(<NavMenu {...defaultProps} titleId={} />);

//     expect(wrapper.find('h3').text()).toEqual('models');
//   });

// });
