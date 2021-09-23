/**
 *
 * ComponentList
 *
 */
/* eslint-disable import/no-cycle */
import React from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import List from '../List';
import useDataManager from '../../hooks/useDataManager';
import Tr from '../Tr';

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
