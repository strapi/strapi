/**
 *
 * SlideDown
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

import styles from './styles.scss';

function SlideDown({ children, classNames, on, timeout }) {
  const classnames = Object.assign({
    enter: styles.enter,
    enterActive: styles.enterActive,
    exit: styles.exit,
    exitActive: styles.exitActive,
  }, classNames);

  return (
    <CSSTransition
      in={on}
      unmountOnExit
      timeout={timeout}
      classNames={classnames}
    >
      {children}
    </CSSTransition>
  );
}

SlideDown.defaultProps = {
  children: <div />,
  classNames: {},
  on: false,
  timeout: 600,
};

SlideDown.propTypes = {
  children: PropTypes.node,
  classNames: PropTypes.object,
  on: PropTypes.bool,
  timeout: PropTypes.number,
};

export default SlideDown;
