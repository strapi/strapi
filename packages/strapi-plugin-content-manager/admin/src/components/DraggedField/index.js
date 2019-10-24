/* eslint-disable react/display-name */
import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Grab, GrabLarge, Pencil, Remove } from '@buffetjs/icons';
import pluginId from '../../pluginId';
import GrabWrapper from './GrabWrapper';
import Link from './Link';
import NameWrapper from './NameWrapper';
import RemoveWrapper from './RemoveWrapper';
import SubWrapper from './SubWrapper';
import Wrapper from './Wrapper';

const DraggedField = forwardRef(
  (
    {
      children,
      count,
      goTo,
      groupUid,
      isDragging,
      isDraggingSibling,
      isHidden,
      isSub,
      label,
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
    const showEditBlockOverState = isOverEditBlock && !isDraggingSibling;
    const displayedLabel = isEmpty(label) ? name : label;

    return (
      <Wrapper
        count={count}
        onDrag={() => setIsOverEditBlock(false)}
        isSelected={isSelected}
        isSub={isSub}
        isOverEditBlock={showEditBlockOverState}
        isOverRemove={isOverRemove}
        style={style}
        withLongerHeight={withLongerHeight}
      >
        {!isHidden && (
          <SubWrapper
            className="sub_wrapper"
            isSelected={isSelected}
            isSub={isSub}
            isOverEditBlock={isOverEditBlock}
            isOverRemove={isOverRemove}
            onMouseEnter={() => {
              if (!isSub) {
                setIsOverEditBlock(true);
              }
            }}
            onMouseLeave={() => setIsOverEditBlock(false)}
            onClick={() => {
              onClick(name);
            }}
            style={{ opacity }}
            withLongerHeight={withLongerHeight}
          >
            <GrabWrapper
              className="grab"
              isSelected={isSelected}
              isOverEditBlock={showEditBlockOverState}
              isOverRemove={isOverRemove}
              ref={ref}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              {withLongerHeight ? (
                <GrabLarge style={{ marginRight: 10, cursor: 'move' }} />
              ) : (
                <Grab style={{ marginRight: 10, cursor: 'move' }} />
              )}
            </GrabWrapper>
            <NameWrapper
              className="name"
              isSelected={isSelected}
              isOverEditBlock={showEditBlockOverState}
              isOverRemove={isOverRemove}
            >
              {children ? (
                <>
                  <span>{displayedLabel}</span>
                  {children}
                </>
              ) : (
                <span>{displayedLabel}</span>
              )}
            </NameWrapper>
            <RemoveWrapper
              className="remove"
              isSelected={isSelected}
              // isOverEditBlock={isOverEditBlock}
              isOverEditBlock={showEditBlockOverState}
              isOverRemove={isOverRemove}
              onClick={onRemove}
              onMouseEnter={() => {
                if (!isSub) {
                  setIsOverRemove(true);
                }
              }}
              onMouseLeave={() => setIsOverRemove(false)}
            >
              {isOverRemove && !isSelected && <Remove />}
              {((showEditBlockOverState && !isOverRemove) || isSelected) && (
                <Pencil />
              )}
              {!showEditBlockOverState && !isOverRemove && !isSelected && (
                <Remove />
              )}
            </RemoveWrapper>
          </SubWrapper>
        )}
        {type === 'group' && (
          <FormattedMessage
            id={`${pluginId}.components.FieldItem.linkToGroupLayout`}
          >
            {msg => (
              <Link
                onClick={e => {
                  e.stopPropagation();

                  goTo(
                    `/plugins/${pluginId}/ctm-configurations/edit-settings/groups/${groupUid}`
                  );
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
  goTo: () => {},
  groupUid: null,
  isDragging: false,
  isDraggingSibling: false,
  isHidden: false,
  isSub: false,
  label: '',
  onClick: () => {},
  onRemove: () => {},
  selectedItem: '',
  style: {},
  withLongerHeight: false,
};

DraggedField.propTypes = {
  children: PropTypes.node,
  count: PropTypes.number,
  goTo: PropTypes.func,
  groupUid: PropTypes.string,
  isDragging: PropTypes.bool,
  isDraggingSibling: PropTypes.bool,
  isHidden: PropTypes.bool,
  isSub: PropTypes.bool,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  selectedItem: PropTypes.string,
  style: PropTypes.object,
  type: PropTypes.string,
  withLongerHeight: PropTypes.bool,
};

export default DraggedField;
