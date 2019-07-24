import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';

import GrabIconBlue from '../../assets/images/icon_grab_blue.svg';
import GrabIcon from '../../assets/images/icon_grab.svg';

import ClickOverHint from '../ClickOverHint';
import EditIcon from '../FieldEditIcon';
import RemoveIcon from '../DraggedRemovedIcon';
import { Carret, FullWidthCarret, NameWrapper, Wrapper } from './components';

const FieldItem = forwardRef(
  (
    {
      isDragging,
      isEditing,
      isSelected,
      name,
      onClickEdit,
      onClickRemove,
      showLeftCarret,
      showRightCarret,
      size,
      style,
      type,
    },
    ref
  ) => {
    const [isOver, setIsOver] = useState(false);
    const isHidden = name === '_TEMP_';
    const withLongerHeight = [
      'json',
      'text',
      'file',
      'group',
      'WYSIWYG',
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
          onClick={onClickRemove}
          withLongerHeight={withLongerHeight}
          isDragging={isOver && isSelected}
        />
      );
    };
    const opacity = isDragging ? 0 : 1;

    return (
      <div
        onClick={onClickEdit}
        onMouseEnter={() => setIsOver(true)}
        onMouseLeave={() => setIsOver(false)}
        style={{ width: `${(1 / 12) * size * 100}%`, ...style }}
        ref={ref}
      >
        <Wrapper>
          {isDragging && size === 12 ? (
            <FullWidthCarret>
              <div />
            </FullWidthCarret>
          ) : (
            <>
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
                  </div>
                  {renderIcon()}
                </NameWrapper>
              </div>
              {showRightCarret && <Carret right style={carretStyle} />}
            </>
          )}
        </Wrapper>
      </div>
    );
  }
);

FieldItem.defaultProps = {
  isDragging: false,
  isEditing: false,
  isSelected: false,
  onClickEdit: () => {},
  onClickRemove: () => {},
  showLeftCarret: false,
  showRightCarret: false,
  style: {},
  type: 'string',
};

FieldItem.propTypes = {
  isDragging: PropTypes.bool,
  isEditing: PropTypes.bool,
  isSelected: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onClickEdit: PropTypes.func,
  onClickRemove: PropTypes.func,
  showLeftCarret: PropTypes.bool,
  showRightCarret: PropTypes.bool,
  size: PropTypes.number.isRequired,
  style: PropTypes.object,
  type: PropTypes.string,
};

export default FieldItem;
