import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Grab, GrabLarge, Pencil } from '@buffetjs/icons';
import { CheckPermissions } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import useLayoutDnd from '../../hooks/useLayoutDnd';
import GrabWrapper from './GrabWrapper';
import Link from './Link';
import NameWrapper from './NameWrapper';
import RemoveWrapper from './RemoveWrapper';
import SubWrapper from './SubWrapper';
import Wrapper from './Wrapper';
import Close from './Close';

/* eslint-disable */
const DraggedField = forwardRef(
  (
    {
      children,
      count,
      goTo,
      componentUid,
      isDragging,
      isHidden,
      isOverDynamicZone,
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
    const { isDraggingSibling } = useLayoutDnd();
    const [isOverRemove, setIsOverRemove] = useState(false);
    const [isOverEditBlock, setIsOverEditBlock] = useState(false);
    const opacity = isDragging ? 0.2 : 1;
    const isSelected = selectedItem === name;
    const showEditBlockOverState = isOverEditBlock && !isOverDynamicZone;
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
            isOverEditBlock={isOverEditBlock}
            isOverRemove={isOverRemove}
            onMouseEnter={() => {
              if (!isSub && !isDraggingSibling) {
                setIsOverEditBlock(true);
              }
            }}
            onMouseLeave={() => {
              setIsOverEditBlock(false);
            }}
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
              {isOverRemove && !isSelected && <Close />}
              {((showEditBlockOverState && !isOverRemove) || isSelected) && <Pencil />}
              {!showEditBlockOverState && !isOverRemove && !isSelected && (
                <Close width="10px" height="10px" />
              )}
            </RemoveWrapper>
          </SubWrapper>
        )}
        {type === 'component' && (
          <CheckPermissions permissions={pluginPermissions.componentsConfigurations}>
            <FormattedMessage id={`${pluginId}.components.FieldItem.linkToComponentLayout`}>
              {msg => (
                <Link
                  onClick={e => {
                    e.stopPropagation();

                    goTo(
                      `/plugins/${pluginId}/ctm-configurations/edit-settings/components/${componentUid}/`
                    );
                  }}
                >
                  <FontAwesomeIcon icon="cog" />
                  {msg}
                </Link>
              )}
            </FormattedMessage>
          </CheckPermissions>
        )}
      </Wrapper>
    );
  }
);

DraggedField.defaultProps = {
  children: null,
  count: 1,
  goTo: () => {},
  componentUid: null,
  isDragging: false,
  isHidden: false,
  isOverDynamicZone: false,
  isSub: false,
  label: '',
  onClick: () => {},
  onRemove: () => {},
  selectedItem: '',
  shouldToggleDraggedFieldOverState: false,
  style: {},
  withLongerHeight: false,
};

DraggedField.propTypes = {
  children: PropTypes.node,
  count: PropTypes.number,
  goTo: PropTypes.func,
  componentUid: PropTypes.string,
  isDragging: PropTypes.bool,
  isHidden: PropTypes.bool,
  isOverDynamicZone: PropTypes.bool,
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

DraggedField.displayName = 'DraggedField';

export default DraggedField;
