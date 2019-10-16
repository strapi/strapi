/**
 *
 * LeftMenu
 *
 */

import React from 'react';

import CustomLink from '../../components/CustomLink';
import LeftMenuList from '../../components/LeftMenuList';

import Wrapper from './Wrapper';

const data = [
  {
    name: 'Content Types',
    searchable: true,
    ctaCompo: {
      Component: CustomLink,
      componentProps: {
        name: 'Create new content type',
      },
    },
    links: [
      {
        name: 'Feature',
        to: '/feature',
      },
      {
        name: 'Invoices',
        to: '/invoices',
      },
      {
        name: 'Link',
        to: '/link',
      },
    ],
  },
  {
    name: 'Components',
    searchable: true,
    ctaCompo: {
      Component: CustomLink,
      componentProps: {
        name: 'Create new component',
      },
    },
    links: [
      {
        name: 'Blog',
        links: [
          {
            name: 'Quote',
            to: 'blog/quote',
          },
          {
            name: 'Related resources',
            to: 'blog/resources',
          },
          {
            name: 'Sliders',
            to: 'blog/sliders',
          },
        ],
      },
      {
        name: 'Website',
        links: [
          {
            name: 'Text',
            to: 'blog/text',
          },
          {
            name: 'Two related entries',
            to: 'blog/entries',
          },
        ],
      },
    ],
  },
];

function LeftMenu() {
  return (
    <Wrapper className="col-md-3">
      {data.map(list => (
        <LeftMenuList {...list} key={list.name} />
      ))}
    </Wrapper>
  );
}

export default LeftMenu;
