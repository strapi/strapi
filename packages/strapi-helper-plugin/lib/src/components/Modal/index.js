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

import Close from '../../svgs/Close';

function WrapperModal({ children, isOpen, onToggle, shouldDisplayCloseButton, ...rest }) {
  return (
    <Wrapper>
      <StyledModal isOpen={isOpen} toggle={onToggle} {...rest}>
        <HeaderModal toggle={onToggle} style={{ display: 'none' }} />
        {shouldDisplayCloseButton && <Close onClick={onToggle} style={{ cursor: 'pointer' }} />}
        {children}
      </StyledModal>
    </Wrapper>
  );
}

WrapperModal.defaultProps = {
  children: null,
  shouldDisplayCloseButton: true,
};

WrapperModal.propTypes = {
  children: PropTypes.node,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  shouldDisplayCloseButton: PropTypes.bool,
};

export default memo(WrapperModal);
export { WrapperModal };
