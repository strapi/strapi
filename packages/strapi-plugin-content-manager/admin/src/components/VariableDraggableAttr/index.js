/**
 * 
 * VariableDraggableAttr
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import ClickOverHint from 'components/ClickOverHint';
import DraggedRemovedIcon  from 'components/DraggedRemovedIcon';

import styles from './styles.scss';

const getBootstrapClass = attrType => {
  switch(attrType) {
    case 'checkbox':
    case 'boolean':
      return {
        bootstrap: 'col-md-3',
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: false,
      };
    case 'date':
      return {
        bootstrap: 'col-md-4',
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: true,
      };
    case 'json':
    case 'wysiwyg':
      return {
        bootstrap: 'col-md-12', 
        wrapper: cn(styles.attrWrapper, styles.customHeight),
        withLargerHeight: true,
      };
    case 'file':
      return {
        bootstrap: 'col-md-6',
        wrapper: cn(styles.attrWrapper, styles.customHeight),
        withLargerHeight: true,
      };
    default:
      return {
        bootstrap: 'col-md-6',
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: false,
      };
  }
};

class VariableDraggableAttr extends React.PureComponent {
  state = { isOver: false };

  handleMouseEnter= () => {
    if (this.props.data.type !== 'boolean') {
      this.setState({ isOver: true });
    }
  }

  handleMouseLeave = () => this.setState({ isOver: false });

  handleRemove = () => {
    const { index, keys, onRemove } = this.props;
    onRemove(index, keys);
  }

  render() {
    const { isOver } = this.state;
    const { data, name } = this.props;
    // NOTE: waiting for the layout to be in the core_store
    let type = name.includes('long') ? 'wysiwyg' : data.type;

    let classNames = getBootstrapClass(type);
    let style = {};

    if (!type) {
      style = { display: 'none' };
      classNames = {
        bootstrap: 'w-100',
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: false,
      };
    }
  
    return (
      <div
        className={classNames.bootstrap}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <div className={classNames.wrapper} style={style}>
          <i className="fa fa-th" aria-hidden="true" />
          <span>
            {name}
          </span>
          <ClickOverHint show={isOver} />
          <DraggedRemovedIcon withLargerHeight={classNames.withLargerHeight} onRemove={this.handleRemove} />
        </div>
      </div>
    );
  }
}

VariableDraggableAttr.defaultProps = {
  data: {
    type: 'text',
  },
  index: 0,
  keys: '',
  name: '',
  onRemove: () => {},
};

VariableDraggableAttr.propTypes = {
  data: PropTypes.object,
  index: PropTypes.number,
  keys: PropTypes.string,
  name: PropTypes.string,
  onRemove: PropTypes.func,
};

export default VariableDraggableAttr;