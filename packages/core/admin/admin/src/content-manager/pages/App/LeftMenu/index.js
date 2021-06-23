/**
 *
 * LeftMenu
 *
 */

import React, { useMemo } from 'react';
import { LeftMenuList, colors, sizes } from '@strapi/helper-plugin';
import styled from 'styled-components';
import { useSelector, shallowEqual } from 'react-redux';
import getTrad from '../../../utils/getTrad';
import { makeSelectModelLinks } from '../selectors';

const Wrapper = styled.div`
  width: 100%;
  min-height: calc(100vh - ${sizes.header.height});
  background-color: ${colors.leftMenu.mediumGrey};
  padding-top: 3.1rem;
  padding-left: 2rem;
  padding-right: 2rem;
`;

const LeftMenu = () => {
  const modelLinksSelector = useMemo(makeSelectModelLinks, []);
  const { collectionTypeLinks, singleTypeLinks } = useSelector(
    state => modelLinksSelector(state),
    shallowEqual
  );

  const data = [
    {
      name: 'models',
      title: {
        id: getTrad('components.LeftMenu.collection-types.'),
      },
      searchable: true,
      links: collectionTypeLinks,
    },
    {
      name: 'singleTypes',
      title: {
        id: getTrad('components.LeftMenu.single-types.'),
      },
      searchable: true,
      links: singleTypeLinks,
    },
  ];

  return (
    <Wrapper className="col-md-3">
      {data.map(list => {
        return <LeftMenuList {...list} key={list.name} />;
      })}
    </Wrapper>
  );
};

export default LeftMenu;
