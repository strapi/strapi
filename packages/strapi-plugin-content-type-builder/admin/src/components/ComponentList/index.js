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

function ComponentList({ customRowComponent, component }) {
  const { modifiedData } = useDataManager();

  const getComponentSchema = componentName => {
    return get(modifiedData, ['components', componentName], {
      schema: { attributes: {} },
    });
  };

  const {
    schema: { attributes },
  } = getComponentSchema(component);

  return (
    <tr className="component-row">
      <td colSpan={12}>
        {List({
          customRowComponent,
          items: convertAttrObjToArray(attributes),
        })}
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
};

export default ComponentList;
