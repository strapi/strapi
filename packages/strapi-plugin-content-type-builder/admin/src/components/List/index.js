/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { List as StyledList } from '@buffetjs/styles';

import ListRow from '../ListRow';

function List({ className, items, customRowComponent }) {
  const renderSelf = props => {
    return (
      <tr>
        <td>
          <div>yo {List(props)}</div>
        </td>
      </tr>
    );
  };

  return (
    <StyledList className={className}>
      <table>
        <tbody>
          {items.map(item => {
            return (
              <React.Fragment key={JSON.stringify(item)}>
                {customRowComponent(item)}

                {item.type === 'component' &&
                  renderSelf({ ok: false, customRowComponent, items: [] })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </StyledList>
  );
}

List.defaultProps = {
  className: null,
  items: [],
  customRowComponent: null,
};

List.propTypes = {
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  items: PropTypes.instanceOf(Array),
};

export default List;
