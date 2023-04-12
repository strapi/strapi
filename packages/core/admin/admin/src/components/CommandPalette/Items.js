/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { useCommand } from './context';
import Item from './Item';

const Items = ({ items, displayOnSearchOnly }) => {
  const cmd = useCommand();

  return (
    <>
      {items.map((item, idx) => {
        if (item.component) {
          const Component = item.component;

          return <Component key={idx} />;
        }

        return (
          <Item
            key={item.label}
            value={item.label}
            onSelect={() => item?.action(cmd)}
            displayOnSearchOnly={displayOnSearchOnly}
          >
            <item.icon /> {item.label}
          </Item>
        );
      })}
    </>
  );
};

Items.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({
        component: PropTypes.elementType,
      }),
      PropTypes.shape({
        icon: PropTypes.elementType,
        label: PropTypes.string.isRequired,
        action: PropTypes.func,
      }),
    ])
  ).isRequired,
  displayOnSearchOnly: PropTypes.bool,
};

Items.defaultProps = {
  displayOnSearchOnly: false,
};

export default Items;
