/**
 *
 * WrapperModal
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';

import HeaderModal from './HeaderModal';
import StyledModal from './StyledModal';
import Wrapper from './Wrapper';

function WrapperModal({ children, isOpen, onToggle, ...rest }) {
  return (
    <Wrapper>
      <StyledModal isOpen={isOpen} toggle={onToggle} {...rest}>
        <HeaderModal toggle={onToggle} />
        {children}
      </StyledModal>
    </Wrapper>
  );
}

WrapperModal.defaultProps = {
  children: null,
};

WrapperModal.propTypes = {
  children: PropTypes.node,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default memo(WrapperModal);
export { WrapperModal };
