/*
*
* OverlayBlocker
*
*/

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

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
    const content = this.props.children ? (
      this.props.children
    ) : (
      <div className={styles.container}>
        <div className={styles.icoContainer}>
          <i className="fa fa-refresh" />
        </div>
        <div>
          <h4>
            <FormattedMessage id="components.OverlayBlocker.title" />
          </h4>
          <p>
            <FormattedMessage id="components.OverlayBlocker.description" />
          </p>
          <div className={styles.buttonContainer}>
            <a className={cn(styles.primary, 'btn')} href="https://strapi.io/documentation/configurations/configurations.html#server" target="_blank">Read the documentation</a>
          </div>
        </div>
      </div>
    );

    if (this.props.isOpen) {
      return ReactDOM.createPortal(
        <div className={styles.overlay}>
          <div>
            {content}
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
