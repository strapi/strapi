import React, { useCallback, useContext, memo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDrag, useDrop } from 'react-sortly';
import { faPen, faArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { useHistory } from 'react-router-dom';
import EditViewContext from '../../contexts/EditView';

const SortableMenuItem = ({ id, depth, name }) => {
  const { editMode } = useContext(EditViewContext);

  // History for redirection back from create/edit pages
  const history = useHistory();
  const location = '/plugins/menu';

  // Details
  const detail = 'plugins/content-manager/collectionType/plugins::menu.item';
  const handleClick_menuItemEdit = useCallback(() => {
    history.push(`/${detail}/${id}?redirectUrl=${location}`);
  }, [history, id]);

  // DnD for Sortly
  const [{ isDragging }, drag, preview] = useDrag({
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });
  const [, drop] = useDrop();

  return (
    <div ref={ref => drop(preview(ref))}>
      <Item key={id} {...{ editMode, depth }}>
        <DraggingIcon ref={editMode ? drag : null} {...{ editMode, depth }}>
          <FontAwesomeIcon icon={faArrowsAlt} />
        </DraggingIcon>
        {!editMode && (
          <EditIcon onClick={handleClick_menuItemEdit} {...{ editMode }}>
            <FontAwesomeIcon icon={faPen} />
          </EditIcon>
        )}
        <div>{name}</div>
      </Item>
    </div>
  );
};

SortableMenuItem.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  depth: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
};

export default memo(SortableMenuItem);

const Item = styled.div`
  margin-top: 5px;
  margin-left: ${({ depth }) => `${depth * 30}px`};
  display: flex;
  flex: 1 0 auto;
  border: solid 1px #e2e2e2;
  border-radius: 5px;
  border-image: initial;
  align-items: center;
  padding: 5px;
  background: rgb(255, 255, 255);
  &:hover {
    background: #cccccc;
  }
`;

const DraggingIcon = styled.div`
  cursor: ${props => (props.editMode ? 'move' : 'normal')};
  display: flex;
  flex: 0 1 auto;
  padding: 5px;
  border: ${props => (props.editMode ? '1px solid black' : '1px solid #e2e2e2')};
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
