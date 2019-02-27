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

const DELAY = 1000;

class OverlayBlocker extends React.Component {
  constructor(props) {
    super(props);

    this.state = { elapsed: 0, start: 0 };
    this.overlayContainer = document.createElement('div');

    document.body.appendChild(this.overlayContainer);
  }

  componentDidUpdate(prevProps) {
    const { isOpen } = this.props;

    if (prevProps.isOpen !== this.props.isOpen && isOpen) {
      this.startTimer();
    }

    if (prevProps.isOpen !== isOpen && !isOpen) {
      this.stopTimer();
    }
  }

  componentWillUnmount() {
    document.body.removeChild(this.overlayContainer);
  }

  tick = () => {
    const { elapsed } = this.state;

    if (elapsed > 30) {
      clearInterval(this.timer);

      return;
    }

    this.setState(prevState => ({ elapsed: (Math.round(Date.now() - prevState.start) / 1000) }));
  }

  startTimer = () => {
    this.setState({ start: Date.now() });
    this.timer = setInterval(this.tick, DELAY);
  }

  stopTimer = () => {
    this.setState({ elapsed: 0 });
    clearInterval(this.timer);
  }

  render() {
    let { title, description, icon } = this.props;
    const { elapsed } = this.state;

    if (elapsed > 30) {
      title = 'components.OverlayBlocker.title.serverError';
      description = 'components.OverlayBlocker.description.serverError';
      icon = 'fa fa-clock-o';
    }

    const content = this.props.children ? (
      this.props.children
    ) : (
      <div className={styles.container}>
        <div className={cn(styles.icoContainer, elapsed < 30 && styles.spin)}>
          <i className={icon} />
        </div>
        <div>
          <h4>
            <FormattedMessage id={title} />
          </h4>
          <p>
            <FormattedMessage id={description} />
          </p>
          { elapsed < 30 && (
            <div className={styles.buttonContainer}>
              <a className={cn(styles.primary, 'btn')} href="https://strapi.io/documentation/configurations/configurations.html#server" target="_blank">Read the documentation</a>
            </div>
          )}
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
  children: null,
  description: 'components.OverlayBlocker.description',
  icon: 'fa fa-refresh',
  isOpen: false,
  title: 'components.OverlayBlocker.title',
};

OverlayBlocker.propTypes = {
  children: PropTypes.node,
  description: PropTypes.string,
  icon: PropTypes.string,
  isOpen: PropTypes.bool,
  title: PropTypes.string,
};

export default OverlayBlocker;
