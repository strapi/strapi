/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

// import convertAttrObjToArray from '../../utils/convertAttrObjToArray';
import useDataManager from '../../hooks/useDataManager';

// TODO fix merge conflict
// import Wrapper from './List';

/* eslint-disable */
function List({ className, customRowComponent, items }) {
  const { modifiedData } = useDataManager();

  const getComponentSchema = componentName => {
    return get(modifiedData, ['components', componentName], {});
  };

  const renderComponentList = ({ component }) => {
    const {
      schema: { attributes },
    } = getComponentSchema(component);

    return (
      <tr className="component-row">
        <td colSpan={12}>
          {/* {List({
            customRowComponent,
            items: convertAttrObjToArray(attributes),
          })} */}
        </td>
      </tr>
    );
  };

  renderComponentList.defaultProps = {
    component: null,
  };

  renderComponentList.propTypes = {
    component: PropTypes.stringÒ,
  };

  const renderDynamicZoneList = ({ components }) => {
    return (
      <tr className="dynamiczone-row">
        <td colSpan={12}>
          {components.map(component => renderComponentList({ component }))}
        </td>
      </tr>
    );
  };

  renderDynamicZoneList.defaultProps = {
    components: [],
  };

  renderDynamicZoneList.propTypes = {
    components: PropTypes.instanceOf(Array),
  };

  return (
    <div className={className}>
      <table>
        <tbody>
          {items.map(item => {
            const { type } = item;
            return (
              <React.Fragment key={JSON.stringify(item)}>
                {customRowComponent(item)}

                {type === 'component' &&
                  renderComponentList({
                    ...item,
                  })}

                {type === 'dynamiczone' &&
                  renderDynamicZoneList({
                    ...item,
                  })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

List.defaultProps = {
  className: null,
  customRowComponent: null,
  items: [],
  isSub: false,
};

List.propTypes = {
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  items: PropTypes.instanceOf(Array),
  isSub: PropTypes.bool,
};

export default List;
