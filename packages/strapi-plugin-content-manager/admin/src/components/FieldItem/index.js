import React, { forwardRef, Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';
import GrabIconBlue from '../../assets/images/icon_grab_blue.svg';
import GrabIcon from '../../assets/images/icon_grab.svg';
import ClickOverHint from '../ClickOverHint';
import EditIcon from '../FieldEditIcon';
import RemoveIcon from '../DraggedRemovedIcon';
import PreviewCarret from '../PreviewCarret';
import { Carret, InfoLabel, Link, NameWrapper, Wrapper } from './components';

const FieldItem = forwardRef(
  (
    {
      groupUid,
      isDragging,
      isEditing,
      isSelected,
      label,
      name,
      onClickEdit,
      onClickRemove,
      push,
      showLeftCarret,
      showRightCarret,
      size,
      style,
      type,
    },
    ref
  ) => {
    console.log(style);
    const [isOver, setIsOver] = useState(false);
    const [dragStart, setDragStart] = useState(false);
    const isHidden = name === '_TEMP_';
    const withLongerHeight = [
      'json',
      'text',
      'file',
      'media',
      'group',
      'richtext',
    ].includes(type);
    const carretStyle = withLongerHeight ? { height: '84px' } : {};
    const renderIcon = () => {
      if (isHidden) {
        return null;
      }

      return (isSelected || isEditing) && !isOver ? (
        <EditIcon withLongerHeight={withLongerHeight} />
      ) : (
        <RemoveIcon
          onClick={e => {
            e.stopPropagation();
            onClickRemove();
          }}
          withLongerHeight={withLongerHeight}
          isDragging={isOver && isSelected}
        />
      );
    };
    const opacity = isDragging ? 0.2 : 1;
    const showLabel =
      (!isOver || isSelected) && label.toLowerCase() !== name.toLowerCase();

    return (
      <div
        onClick={isHidden ? () => {} : onClickEdit}
        onDrag={() => {
          if (size === 12) {
            setDragStart(true);
          }
        }}
        onDragEnd={() => {
          if (size === 12) {
            setDragStart(false);
          }
        }}
        onMouseEnter={() => setIsOver(true)}
        onMouseLeave={() => setIsOver(false)}
        style={{ width: `${(1 / 12) * size * 100}%`, ...style }}
        ref={ref}
      >
        <Wrapper>
          {dragStart && size === 12 ? (
            <PreviewCarret />
          ) : (
            <Fragment>
              {showLeftCarret && <Carret style={carretStyle} />}
              <div className="sub_wrapper" style={{ opacity }}>
                <NameWrapper
                  style={carretStyle}
                  isEditing={isEditing}
                  isHidden={isHidden}
                  isSelected={isSelected}
                >
                  <div>
                    {!isHidden && (
                      <img
                        src={isEditing || isSelected ? GrabIconBlue : GrabIcon}
                        alt="Grab Icon"
                        style={{ marginRight: 10 }}
                      />
                    )}
                    <span className="name">{!isHidden && name}</span>
                    {!isHidden && (
                      <ClickOverHint show={isOver && !isSelected} />
                    )}
                    {!isHidden && showLabel && <InfoLabel>{label}</InfoLabel>}
                  </div>
                  {renderIcon()}
                  {type === 'group' && (
                    <FormattedMessage
                      id={`${pluginId}.components.FieldItem.linkToGroupLayout`}
                    >
                      {msg => (
                        <Link
                          onClick={() =>
                            push(
                              `/plugins/${pluginId}/ctm-configurations/groups/${groupUid}`
                            )
                          }
                        >
                          {msg}
                        </Link>
                      )}
                    </FormattedMessage>
                  )}
                </NameWrapper>
              </div>
              {showRightCarret && <Carret right style={carretStyle} />}
            </Fragment>
          )}
        </Wrapper>
      </div>
    );
  }
);

FieldItem.defaultProps = {
  groupUid: '',
  isDragging: false,
  isEditing: false,
  isSelected: false,
  label: '',
  onClickEdit: () => {},
  onClickRemove: () => {},
  push: () => {},
  showLeftCarret: false,
  showRightCarret: false,
  style: {},
  type: 'string',
};

FieldItem.propTypes = {
  groupUid: PropTypes.string,
  isDragging: PropTypes.bool,
  isEditing: PropTypes.bool,
  isSelected: PropTypes.bool,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onClickEdit: PropTypes.func,
  onClickRemove: PropTypes.func,
  push: PropTypes.func,
  showLeftCarret: PropTypes.bool,
  showRightCarret: PropTypes.bool,
  size: PropTypes.number.isRequired,
  style: PropTypes.object,
  type: PropTypes.string,
};

export default FieldItem;
