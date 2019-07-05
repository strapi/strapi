import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Field, Wrapper, InfoLabel } from './components';

import GrabIcon from '../../assets/images/icon_grab.svg';
import GrabIconBlue from '../../assets/images/icon_grab_blue.svg';
import ClickOverHint from '../../components/ClickOverHint';
import RemoveIcon from '../../components/DraggedRemovedIcon';
import EditIcon from '../../components/VariableEditIcon';

function ListField({ index, isSelected, label, name, onClick, onRemove }) {
  const [isOver, setIsOver] = useState(false);
  const showLabel =
    (!isOver || isSelected) && label.toLowerCase() !== name.toLowerCase();

  return (
    <Wrapper
      onMouseEnter={() => setIsOver(true)}
      onMouseLeave={() => setIsOver(false)}
      onClick={() => {
        onClick(index);
      }}
    >
      <div>{index + 1}.</div>
      <Field isSelected={isSelected}>
        <img src={isSelected ? GrabIconBlue : GrabIcon} />
        <span>{name}</span>
        <ClickOverHint show={isOver && !isSelected} />
        {showLabel && <InfoLabel>{label}</InfoLabel>}
        {isSelected && !isOver ? (
          <EditIcon />
        ) : (
          <RemoveIcon
            isDragging={isSelected && isOver}
            onRemove={e => {
              e.stopPropagation();
              onRemove(index);
            }}
          />
        )}
      </Field>
    </Wrapper>
  );
}

ListField.defaultProps = {
  label: '',
  onClick: () => {},
  onRemove: () => {},
};

ListField.propTypes = {
  index: PropTypes.number.isRequired,
  isSelected: PropTypes.bool.isRequired,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
};

export default memo(ListField);
