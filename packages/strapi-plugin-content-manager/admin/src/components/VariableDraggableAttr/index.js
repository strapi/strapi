/**
 * 
 * VariableDraggableAttr
 */

/* eslint-disable react/no-find-dom-node */
import React from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import {
  DragSource,
  DropTarget,
} from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { get, flow } from 'lodash';
import cn from 'classnames';
import ClickOverHint from 'components/ClickOverHint';
import DraggedRemovedIcon  from 'components/DraggedRemovedIcon';
import VariableEditIcon from 'components/VariableEditIcon';
import ItemTypes from 'utils/ItemTypes';

import GrabIconBlue from 'assets/images/icon_grab_blue.svg';
import GrabIcon from 'assets/images/icon_grab.svg';

import Carret from './Carret';
import styles from './styles.scss';

const getBootstrapClass = attrType => {
  switch(attrType) {
    case 'checkbox':
    case 'boolean':
    case 'toggle':
    case 'date':
    case 'bigint':
    case 'decimal':
    case 'float':
    case 'integer':
    case 'number':
      return {
        bootstrap: 'col-md-4',
        wrapper: cn(styles.attrWrapper),
        withLongerHeight: false,
      };
    case 'json':
    case 'wysiwyg':
    case 'WYSIWYG':
      return {
        bootstrap: 'col-md-12', 
        wrapper: cn(styles.attrWrapper, styles.customHeight),
        withLongerHeight: true,
      };
    case 'file':
    case 'text':
      return {
        bootstrap: 'col-md-6',
        wrapper: cn(styles.attrWrapper, styles.customHeight),
        withLongerHeight: true,
      };
    default:
      return {
        bootstrap: 'col-md-6',
        wrapper: cn(styles.attrWrapper),
        withLongerHeight: false,
      };
  }
};
const variableDraggableAttrSource = {
  beginDrag: (props, monitor, component) => {
    props.beginMove(props.name, props.index, props.keys);

    return {
      component,
      id: props.id,
      index: props.index,
    };
  },
  endDrag: props => {
    props.endMove(props.keys);
    return {};
  },
};
const variableDraggableAttrTarget = {
  hover: (props, monitor, component) => {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return;
    }

    // Determine rectangle on screen
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect();

    // Get vertical middle
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

    // Determine mouse position
    const clientOffset = monitor.getClientOffset();

    // Get pixels to the top
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%

    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }

    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }

    // Time to actually perform the action
    props.moveAttr(dragIndex, hoverIndex, props.keys);

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    monitor.getItem().index = hoverIndex;
  },
};

class VariableDraggableAttr extends React.Component {
  constructor(props) {
    super(props);
    const { data, layout, name } = this.props;
    const appearance = get(layout, [name, 'appearance'], '');
    const type = appearance !== '' ? appearance : data.type;    
    let classNames = getBootstrapClass(type);
    let style = {};

    if (!type) {
      style = { display: 'none' };
      classNames = {
        bootstrap: name.split('__')[1],
        wrapper: cn(styles.attrWrapper),
        withLongerHeight: false,
      };
    }
    this.state = {
      classNames,
      dragStart: false,
      isOver: false,
      style,
    };
  }

  componentDidMount() {
    // Use empty image as a drag preview so browsers don't draw it
    // and we can draw whatever we want on the custom drag layer instead.
    this.props.connectDragPreview(getEmptyImage(), {});
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isDragging !== this.props.isDragging) {
      this.handleDragEffect();
    }

    if (prevProps.isDragging !== this.props.isDragging && this.props.isDragging) {
      this.handleClickEdit();
    }
  }

  handleClickEdit = () => {
    this.props.onClickEdit(this.props.index);
  }

  handleDragEffect = () => this.setState(prevState => ({ dragStart: !prevState.dragStart }));

  handleMouseEnter= () => {
    this.setState({ isOver: true });
  }

  handleMouseLeave = () => this.setState({ isOver: false });

  handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { index, keys, onRemove } = this.props;
    onRemove(index, keys);
  }

  renderContent = () => {
    let { classNames, isOver, style, dragStart } = this.state;
    const { data, draggedItemName, grid, hoverIndex, index, initDragLine, isEditing, name } = this.props;
    const isFullSize = classNames.bootstrap === 'col-md-12';
    let itemLine = -1;
    let itemLineEls = [];
    // Retrieve from the grid the attr's y coordinate
    grid.forEach((line, index) => {
      if (line.indexOf(name) !== -1) {
        itemLine = index;
        itemLineEls = line;
      }
    });
    // Retrieve from the grid the attr's x coordinate
    const itemPosition = get(grid, itemLine, []).indexOf(name);
    // Retrieve the draggedItem's y coordinate in order to display a custom dropTarget (the blue caret).
    const draggedItemLineIndex = get(grid, itemLine, []).indexOf(draggedItemName);
    // The source target can either located on the left or right of an attr
    let showLeftCarret = hoverIndex === index && initDragLine !== itemLine;
    let showRightCarret = hoverIndex === index && initDragLine === itemLine;

    if (hoverIndex === index && initDragLine === itemLine && (itemPosition === 0 || itemPosition === 1 && itemLineEls.length > 2)) {
      if (itemLineEls.length < 3 || itemPosition === 0 || draggedItemLineIndex > itemPosition) {
        showLeftCarret = true;
        showRightCarret = false;
      }
    }
    
    /**
     * Retrieve the blue Caret custom style depending on its position and attr's height
     */
    const carretStyle = (() => {
      let style = { height: '30px', marginRight: '3px' };

      if (classNames.withLongerHeight) {
        style = { height: '84px', marginRight: '3px' };
      }

      if (isFullSize) {
        style = { width: '100%', height: '2px', marginBottom: '6px' };
      }

      if (showRightCarret) {
        style = { height: '30px', marginLeft: '3px' };
      }

      return style;
    })();

    // If the draggedItem is full size, for instance the WYSIWYG or the json field return a full size blue caret
    if (dragStart && isFullSize) {
      return <Carret style={carretStyle} />;
    }

    return (
      <div style={{ display: 'flex' }}>
        { showLeftCarret && <Carret style={carretStyle} />}
        <div className={cn(classNames.wrapper, isEditing && styles.editingVariableAttr)} style={style}>
          <img src={(isEditing ? GrabIconBlue : GrabIcon)} alt="Grab Icon" />
          <span className={cn(isEditing && styles.editing, styles.truncated)}>
            {name}
          </span>
          <ClickOverHint show={isOver && !isEditing} />
          {(!isOver || isEditing) && get(data, 'name', '').toLowerCase() !== get(data, 'label', '').toLowerCase() && (
            <div className={cn(styles.infoLabel, isEditing && styles.infoLabelHover)}>
              {data.label}
            </div>
          )}
          {isEditing && !isOver ? (
            <VariableEditIcon withLongerHeight={classNames.withLongerHeight} onClick={this.handleClickEdit} />
          ) : (
            <DraggedRemovedIcon isDragging={isEditing} withLongerHeight={classNames.withLongerHeight} onRemove={this.handleRemove} />
          )}
        </div>
        { showRightCarret && <Carret style={carretStyle} />}
      </div>
    );
  }

  render() {
    const { classNames } = this.state;
    const {
      connectDragSource,
      connectDropTarget,
    } = this.props;

    return (
      connectDragSource(
        connectDropTarget(
          <div
            className={cn(classNames.bootstrap)}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            onClick={this.handleClickEdit}
          >
            {this.renderContent()}
          </div>
        ),
      )
    );
  }
}

VariableDraggableAttr.defaultProps = {
  data: {
    type: 'text',
  },
  draggedItemName: null,
  grid: [],
  hoverIndex: -1,
  index: 0,
  initDragLine: -1,
  isDragging: false,
  isEditing: false,
  keys: '',
  layout: {},
  name: '',
  onClickEdit: () => {},
  onRemove: () => {},
};

VariableDraggableAttr.propTypes = {
  connectDragPreview: PropTypes.func.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  data: PropTypes.object,
  draggedItemName: PropTypes.string,
  grid: PropTypes.array,
  hoverIndex: PropTypes.number,
  index: PropTypes.number,
  initDragLine: PropTypes.number,
  isDragging: PropTypes.bool,
  isEditing: PropTypes.bool,
  keys: PropTypes.string,
  layout: PropTypes.object,
  name: PropTypes.string,
  onClickEdit: PropTypes.func,
  onRemove: PropTypes.func,
};

const withDropTarget = DropTarget(ItemTypes.VARIABLE, variableDraggableAttrTarget, (connect) => ({
  connectDropTarget: connect.dropTarget(),
}));
const withDragSource = DragSource(ItemTypes.VARIABLE, variableDraggableAttrSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
}));

export default flow([withDropTarget, withDragSource])(VariableDraggableAttr);