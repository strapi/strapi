/**
 *
 * BodyModal
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import Wrapper from './Wrapper';

function BodyModal({ children, ...rest }) {
  return (
    <Wrapper {...rest}>
      <div className="container-fluid">
        <div className="row">{children}</div>
      </div>
    </Wrapper>
  );
}

/* istanbul ignore next */
BodyModal.defaultProps = {
  children: null,
};

BodyModal.propTypes = {
  children: PropTypes.node,
};

export default memo(BodyModal);
export { BodyModal };
