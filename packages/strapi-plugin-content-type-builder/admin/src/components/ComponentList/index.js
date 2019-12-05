/**
 *
 * ComponentList
 *
 */

import React from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import List from '../List';

import convertAttrObjToArray from '../../utils/convertAttrObjToArray';
import useDataManager from '../../hooks/useDataManager';

function ComponentList({
  customRowComponent,
  component,
  mainTypeName,

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
      <td colSpan={12}>
        <List
          customRowComponent={customRowComponent}
          items={convertAttrObjToArray(attributes)}
          targetUid={component}
          mainTypeName={mainTypeName}
          firstLoopComponentName={firstLoopComponentName || componentName}
          firstLoopComponentUid={firstLoopComponentUid || component}
          editTarget="components"
          isSub
          secondLoopComponentName={
            firstLoopComponentName ? componentName : null
          }
          secondLoopComponentUid={firstLoopComponentUid ? component : null}
        />
      </td>
    </tr>
  );
}

ComponentList.defaultProps = {
  component: null,
  customRowComponent: null,
};

ComponentList.propTypes = {
  component: PropTypes.string,
  customRowComponent: PropTypes.func,
  firstLoopComponentName: PropTypes.string,
  firstLoopComponentUid: PropTypes.string,
  mainTypeName: PropTypes.string.isRequired,
  targetUid: PropTypes.string.isRequired,
};

export default ComponentList;
