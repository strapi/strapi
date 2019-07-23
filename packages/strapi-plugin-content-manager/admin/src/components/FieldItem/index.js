import React, { memo } from 'react';
import PropTypes from 'prop-types';

// import EditIcon from '../VariableEditIcon';
import RemoveIcon from '../DraggedRemovedIcon';
import { Carret, FullWidthCarret, NameWrapper, Wrapper } from './components';

const FieldItem = ({
  isDragging,
  name,
  showLeftCarret,
  showRightCarret,
  size,
  type,
}) => {
  const isHidden = name === '_TEMP_';
  const withLongerHeight = [
    'json',
    'text',
    'file',
    'group',
    'WYSIWYG',
  ].includes(type);
  const style = withLongerHeight ? { height: '84px' } : {};

  return (
    <div style={{ width: `${(1 / 12) * size * 100}%` }}>
      <Wrapper>
        {isDragging && size === 12 ? (
          <FullWidthCarret>
            <div />
          </FullWidthCarret>
        ) : (
          <>
            {showLeftCarret && <Carret style={style} />}
            <div className="sub_wrapper">
              <NameWrapper style={style} isHidden={isHidden}>
                <span>{!isHidden && name}</span>
                {!isHidden && (
                  <RemoveIcon withLongerHeight={withLongerHeight} />
                )}
              </NameWrapper>
            </div>
            {showRightCarret && <Carret right style={style} />}
          </>
        )}
      </Wrapper>
    </div>
  );
};

FieldItem.defaultProps = {
  isDragging: false,
  showLeftCarret: false,
  showRightCarret: false,
  type: 'string',
};

FieldItem.propTypes = {
  isDragging: PropTypes.bool,
  name: PropTypes.string.isRequired,
  showLeftCarret: PropTypes.bool,
  showRightCarret: PropTypes.bool,
  size: PropTypes.number.isRequired,
  type: PropTypes.string,
};

export default memo(FieldItem);
