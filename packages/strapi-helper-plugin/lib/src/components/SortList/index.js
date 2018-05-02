import React from 'react';
import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Ico from 'components/Ico';
import styles from './styles.scss';


// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const getItemStyle = (isDragging, draggableStyle) => ({
  opacity: isDragging ? 0.7 : 1,

  // styles we need to apply on draggables
  ...draggableStyle,
});

const getListStyle = isDraggingOver => ({
  background: isDraggingOver ? 'white' : 'white',
  maxHeight: '50vh',
  overflow: 'auto',
});

class SortList extends React.Component {
  onDragEnd = (result) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }
    const { items, onChange } = this.props;
    const ordered = reorder(
      items,
      result.source.index,
      result.destination.index,
    );
    onChange(ordered);
  }
  render() {
    const { items, onRemove } = this.props;
    
    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable">
          {(droppableProvided, droppableSnapshot) => (
            <div
              ref={droppableProvided.innerRef}
              style={getListStyle(droppableSnapshot.isDraggingOver)}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(draggableProvided, draggableSnapshot) => (
                    <div
                      className={styles.item}
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                      style={getItemStyle(
                        draggableSnapshot.isDragging,
                        draggableProvided.draggableProps.style
                      )}
                    >
                      <span>{item.title}</span>
                      <span className={styles.type}>{item.type}</span>
                      <span className={styles.clear}><Ico icoType="trash" onClick={() => onRemove(item)} /></span>
                    </div>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  }
}

SortList.defaultProps = {
  items: [],
};

SortList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string,
    id: PropTypes.string,
    title: PropTypes.string,
  })),
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,  
};

export default SortList;