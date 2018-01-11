/*
*
* OverlayBlocker
*
*/

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import styles from './styles.scss';

class OverlayBlocker extends React.Component {
  constructor(props) {
    super(props);
    this.overlayContainer = document.createElement('div');
    document.body.appendChild(this.overlayContainer);
  }

  componentWillUnmount() {
    document.body.removeChild(this.overlayContainer);
  }

  render() {
    if (this.props.isOpen) {
      return ReactDOM.createPortal(
        <div className={styles.overlay}>
          <div>
            {this.props.children}
          </div>
        </div>,
        this.overlayContainer
      );
    }

    return '';
  }
}

OverlayBlocker.defaultProps = {
  children: '',
  isOpen: false,
};

OverlayBlocker.propTypes = {
  children: PropTypes.node,
  isOpen: PropTypes.bool,
};

export default OverlayBlocker;
