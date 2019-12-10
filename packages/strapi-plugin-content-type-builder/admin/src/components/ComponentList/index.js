/**
 *
 * ComponentList
 *
 */

import React from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import List from '../List';
import useDataManager from '../../hooks/useDataManager';
import convertAttrObjToArray from '../../utils/convertAttrObjToArray';
import Td from '../Td';

function ComponentList({
  customRowComponent,
  component,
  mainTypeName,
  isFromDynamicZone,
  firstLoopComponentName,
  firstLoopComponentUid,
}) {
  const { modifiedData } = useDataManager();
  const {
    schema: { name: componentName, attributes },
  } = get(modifiedData, ['components', component], {
    schema: { attributes: {} },
  });

  return (
    <tr className="component-row">
      <Td colSpan={12} isChildOfDynamicZone={isFromDynamicZone}>
        <List
          customRowComponent={customRowComponent}
          items={convertAttrObjToArray(attributes)}
          targetUid={component}
          mainTypeName={mainTypeName}
          firstLoopComponentName={firstLoopComponentName || componentName}
          firstLoopComponentUid={firstLoopComponentUid || component}
          editTarget="components"
          isFromDynamicZone={isFromDynamicZone}
          isSub
          secondLoopComponentName={
            firstLoopComponentName ? componentName : null
          }
          secondLoopComponentUid={firstLoopComponentUid ? component : null}
        />
      </Td>
    </tr>
  );
}

ComponentList.defaultProps = {
  component: null,
  customRowComponent: null,
  isFromDynamicZone: false,
};

ComponentList.propTypes = {
  component: PropTypes.string,
  customRowComponent: PropTypes.func,
  firstLoopComponentName: PropTypes.string,
  firstLoopComponentUid: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  mainTypeName: PropTypes.string.isRequired,
  targetUid: PropTypes.string.isRequired,
};

export default ComponentList;
