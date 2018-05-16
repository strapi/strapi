/**
 *
 * FiltersPickWrapper
 */

import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

import Div from './Div';
import styles from './styles.scss';

function FiltersPickWrapper({ show }) {
  return (
    <CSSTransition
      in={show}
      unmountOnExit
      timeout={400}
      classNames={{
        enter: styles.enter,
        enterActive: styles.enterActive,
        exit: styles.exit,
        exitActive: styles.exitActive,
      }}
    >
      <Div>
        Prepare for select filters
      </Div>
    </CSSTransition>
  );
}


FiltersPickWrapper.propTypes = {
  show: PropTypes.bool.isRequired,
};

export default FiltersPickWrapper;
