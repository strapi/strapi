import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Field, Wrapper } from './components';

import GrabIcon from '../../assets/images/icon_grab.svg';
import ClickOverHint from '../../components/ClickOverHint';
import RemoveIcon from '../../components/DraggedRemovedIcon';

function ListField({ index, name, onRemove }) {
  const [isOver, setIsOver] = useState(false);

  return (
    <Wrapper
      onMouseEnter={() => setIsOver(true)}
      onMouseLeave={() => setIsOver(false)}
    >
      <div>{index + 1}.</div>
      <Field>
        <img src={GrabIcon} />
        <span>{name}</span>
        <ClickOverHint show={isOver} />
        <RemoveIcon isDragging={false} onRemove={() => onRemove(index)} />
      </Field>
    </Wrapper>
  );
}

ListField.defaultProps = {
  onRemove: () => {},
};

ListField.propTypes = {
  index: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  onRemove: PropTypes.func,
};

export default memo(ListField);
