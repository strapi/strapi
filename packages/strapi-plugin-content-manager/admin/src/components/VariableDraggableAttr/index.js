/**
 * 
 * VariableDraggableAttr
 */

import React from 'react';
// import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

const getBootstrapClass = (attrType) => {
  switch(attrType) {
    case 'checkbox':
      return cn('col-md-3', styles.normalHeight);
    case 'date':
      return cn('col-md-4', styles.normalHeight);
    case 'json':
    case 'wysiwyg':
      return cn('col-md-12', styles.customHeight);
    case 'file':
      return cn('col-md-6', styles.customHeight);
    default:
      return cn('col-md-6', styles.normalHeight);
  }
};

function VariableDraggableAttr() {
  // NOTE: waiting for the layout to be in the core_store
  // const type = props.attr.name.includes('long') ? 'wysiwyg' : props.attr.type;
  const type = 'text';

  return (
    <div className={getBootstrapClass(type)}>
      {/* yo */}
    </div>
  );
}

VariableDraggableAttr.defaultProps = {};

VariableDraggableAttr.propTypes = {};

export default VariableDraggableAttr;