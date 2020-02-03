/* eslint-disable import/no-unresolved */
import { faPen, faArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDrag, useDrop } from 'react-sortly';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const Item = styled.div`
  margin-top: 5px;
  display: flex;
  flex: 1 0 auto;
  border: solid 1px #e2e2e2;
  border-radius: 5px;
  border-image: initial;
  align-items: center;
  padding: 5px;
  background: rgb(255, 255, 255);
  input {
    width: 100%;
    padding: 5px 10px;
    &:hover {
      outline: ${props => (props.editMode ? '1px solid #6c757d' : 'none')};
    }
  }
  &:hover {
    background: #cccccc;
  }
`;

const DraggingIcon = styled.div`
  cursor: ${props => (props.editMode ? 'move' : 'normal')};
  display: flex;
  flex: 0 1 auto;
  padding: 5px;
  border: ${props =>
    props.editMode ? '1px solid black' : '1px solid #e2e2e2'};
  border-radius: 5px;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
  > svg {
    font-size: 2em;
    color: ${props => (props.editMode ? 'black' : '#e2e2e2')};
  }
`;

const EditIcon = styled.div`
  display: flex;
  flex: 0 1 auto;
  padding: 5px;
  border-radius: 5px;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
  transition: 0.3s ease-in-out;
  cursor: pointer;
  > svg {
    font-size: 1.6em;
    color: black;
  }
  &:hover {
    background: #6c757d;
  }
`;

export default function SortableMenuItem({
  id,
  depth,
  value,
  onChange,
  onClick,
  onKeyDown,
  editMode,
  myRef,
  isNew,
}) {
  // DnD for Sortly
  const [drag, preview] = useDrag({
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });
  const [, drop] = useDrop();

  // Collect events here and invoke callbacks with usefull arguments
  const handleClickItemDetail = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  const handleChangeInputValue = useCallback(
    e => {
      onChange(id, e.target.value);
    },
    [id, onChange]
  );

  const handleKeyDownInput = useCallback(
    e => {
      onKeyDown(id, e);
    },
    [id, onKeyDown]
  );

  return (
    <div ref={ref => drop(preview(ref))}>
      <Item style={{ marginLeft: depth * 30 }} key={id} editMode={editMode}>
        <DraggingIcon
          ref={editMode ? drag : null}
          depth={depth}
          editMode={editMode}
        >
          <FontAwesomeIcon icon={faArrowsAlt} />
        </DraggingIcon>
        {!isNew && (
          <EditIcon onClick={handleClickItemDetail} editMode={editMode}>
            <FontAwesomeIcon icon={faPen} />
          </EditIcon>
        )}
        <input
          disabled={!editMode}
          value={value}
          onChange={handleChangeInputValue}
          onKeyDown={handleKeyDownInput}
          ref={myRef}
        />
      </Item>
    </div>
  );
}

SortableMenuItem.propTypes = {
  id: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired,
  myRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]).isRequired,
  isNew: PropTypes.bool.isRequired,
};
