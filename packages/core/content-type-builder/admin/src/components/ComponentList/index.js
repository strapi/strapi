/**
 *
 * ComponentList
 *
 */
/* eslint-disable import/no-cycle */
import React from 'react';

import get from 'lodash/get';
import PropTypes from 'prop-types';

import useDataManager from '../../hooks/useDataManager';
import List from '../List';
import Tr from '../Tr';

function ComponentList({
  customRowComponent,
  component,
  isFromDynamicZone,
  isNestedInDZComponent,
  firstLoopComponentUid,
}) {
  const { modifiedData } = useDataManager();
  const {
    schema: { attributes },
  } = get(modifiedData, ['components', component], {
    schema: { attributes: [] },
  });

  return (
    <Tr isChildOfDynamicZone={isFromDynamicZone} className="component-row">
      <td colSpan={12}>
        <List
          customRowComponent={customRowComponent}
          items={attributes}
          targetUid={component}
          firstLoopComponentUid={firstLoopComponentUid || component}
          editTarget="components"
          isFromDynamicZone={isFromDynamicZone}
          isNestedInDZComponent={isNestedInDZComponent}
          isSub
          secondLoopComponentUid={firstLoopComponentUid ? component : null}
        />
      </td>
    </Tr>
  );
}

ComponentList.defaultProps = {
  component: null,
  customRowComponent: null,
  firstLoopComponentUid: null,
  isFromDynamicZone: false,
  isNestedInDZComponent: false,
};

ComponentList.propTypes = {
  component: PropTypes.string,
  customRowComponent: PropTypes.func,
  firstLoopComponentUid: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  isNestedInDZComponent: PropTypes.bool,
};

export default ComponentList;
