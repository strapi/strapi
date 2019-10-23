/* eslint-disable react/display-name */
import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Grab, GrabLarge, Pencil, Remove } from '@buffetjs/icons';
import pluginId from '../../pluginId';
import Link from './Link';
import Wrapper from './Wrapper';

const DraggedField = forwardRef(
  (
    {
      children,
      count,
      isDragging,
      isHidden,
      name,
      onClick,
      onRemove,
      selectedItem,
      style,
      type,
      withLongerHeight,
    },
    ref
  ) => {
    const opacity = isDragging ? 0.2 : 1;
    const [isOverRemove, setIsOverRemove] = useState(false);
    const [isOverEditBlock, setIsOverEditBlock] = useState(false);
    const isSelected = selectedItem === name;

    return (
      <Wrapper
        count={count}
        onDrag={() => setIsOverEditBlock(false)}
        isSelected={isSelected}
        isOverEditBlock={isOverEditBlock}
        isOverRemove={isOverRemove}
        style={style}
        withLongerHeight={withLongerHeight}
      >
        {!isHidden && (
          <div
            className="sub_wrapper"
            style={{ opacity }}
            onMouseEnter={() => setIsOverEditBlock(true)}
            onMouseLeave={() => setIsOverEditBlock(false)}
            onClick={() => {
              onClick(name);
            }}
          >
            <div className="grab" ref={ref} onClick={e => e.stopPropagation()}>
              {withLongerHeight ? (
                <GrabLarge style={{ marginRight: 10, cursor: 'move' }} />
              ) : (
                <Grab style={{ marginRight: 10, cursor: 'move' }} />
              )}
            </div>
            <div className="name">{children ? children : name}</div>
            <div
              className="remove"
              onClick={onRemove}
              onMouseEnter={() => setIsOverRemove(true)}
              onMouseLeave={() => setIsOverRemove(false)}
            >
              {isOverRemove && !isSelected && <Remove />}
              {((isOverEditBlock && !isOverRemove) || isSelected) && <Pencil />}
              {!isOverEditBlock && !isOverRemove && !isSelected && <Remove />}
            </div>
          </div>
        )}
        {type === 'group' && (
          <FormattedMessage
            id={`${pluginId}.components.FieldItem.linkToGroupLayout`}
          >
            {msg => (
              <Link
                onClick={e => {
                  e.stopPropagation();
                  // push(
                  //   `/plugins/${pluginId}/ctm-configurations/groups/${groupUid}`
                  // )
                }}
              >
                {msg}
              </Link>
            )}
          </FormattedMessage>
        )}
      </Wrapper>
    );
  }
);

DraggedField.defaultProps = {
  children: null,
  count: 1,
  isDragging: false,
  isHidden: false,
  onClick: () => {},
  onRemove: () => {},
  selectedItem: '',
  style: {},
  withLongerHeight: false,
};

DraggedField.propTypes = {
  children: PropTypes.node,
  count: PropTypes.number,
  isDragging: PropTypes.bool,
  isHidden: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  selectedItem: PropTypes.string,
  style: PropTypes.object,
  type: PropTypes.string,
  withLongerHeight: PropTypes.bool,
};

export default DraggedField;
