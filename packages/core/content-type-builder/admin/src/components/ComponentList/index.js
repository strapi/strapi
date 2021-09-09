/**
 *
 * ComponentList
 *
 */
/* eslint-disable import/no-cycle */
import React from 'react';
import { get } from 'lodash';
import styled from 'styled-components';
import { pxToRem } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import List from '../List';
import useDataManager from '../../hooks/useDataManager';

// Keep component-row for css specificity
const Tr = styled.tr`
  &.component-row {
    position: relative;
    border-top: none !important;

    table tr:first-child {
      border-top: none;
    }

    > td:first-of-type {
      padding: 0 0 0 ${pxToRem(20)};
      &::before {
        content: '';
        width: ${pxToRem(4)};
        height: calc(100% - 15px);
        position: absolute;
        top: -7px;
        left: 17px;
        border-radius: 4px;

        ${({ isFromDynamicZone, isChildOfDynamicZone, theme }) => {
          if (isChildOfDynamicZone) {
            return `
          z-index: -1;
          background-color: transparent !important;
        `;
          }

          if (isFromDynamicZone) {
            return `
          background-color: #AED4FB !important;
        `;
          }

          return `
        background: ${theme.colors.neutral150}};
      `;
        }}
      }
    }
  }
`;

function ComponentList({
  customRowComponent,
  component,
  dzName,
  mainTypeName,
  isFromDynamicZone,
  isNestedInDZComponent,
  firstLoopComponentName,
  firstLoopComponentUid,
}) {
  const { modifiedData } = useDataManager();
  const {
    schema: { name: componentName, attributes },
  } = get(modifiedData, ['components', component], {
    schema: { attributes: [] },
  });

  return (
    <Tr isChildOfDynamicZone={isFromDynamicZone} className="component-row">
      <td colSpan={12}>
        <List
          customRowComponent={customRowComponent}
          dzName={dzName}
          items={attributes}
          targetUid={component}
          mainTypeName={mainTypeName}
          firstLoopComponentName={firstLoopComponentName || componentName}
          firstLoopComponentUid={firstLoopComponentUid || component}
          editTarget="components"
          isFromDynamicZone={isFromDynamicZone}
          isNestedInDZComponent={isNestedInDZComponent}
          isSub
          secondLoopComponentName={firstLoopComponentName ? componentName : null}
          secondLoopComponentUid={firstLoopComponentUid ? component : null}
        />
      </td>
    </Tr>
  );
}

ComponentList.defaultProps = {
  component: null,
  customRowComponent: null,
  dzName: null,
  firstLoopComponentName: null,
  firstLoopComponentUid: null,
  isFromDynamicZone: false,
  isNestedInDZComponent: false,
};

ComponentList.propTypes = {
  component: PropTypes.string,
  customRowComponent: PropTypes.func,
  dzName: PropTypes.string,
  firstLoopComponentName: PropTypes.string,
  firstLoopComponentUid: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  isNestedInDZComponent: PropTypes.bool,
  mainTypeName: PropTypes.string.isRequired,
};

export default ComponentList;
