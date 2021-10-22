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

function WrapperModal({ children, isOpen, onToggle, closeButtonColor, ...rest }) {
  return (
    <Wrapper>
      <StyledModal isOpen={isOpen} toggle={onToggle} {...rest}>
        <HeaderModal toggle={onToggle} style={{ display: 'none' }} fill={closeButtonColor} />
        <Close onClick={onToggle} style={{ cursor: 'pointer' }} />
        {children}
      </StyledModal>
    </Wrapper>
  );
}

WrapperModal.defaultProps = {
  children: null,
  closeButtonColor: '#c3c5c8',
};

WrapperModal.propTypes = {
  children: PropTypes.node,
  closeButtonColor: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default memo(WrapperModal);
export { WrapperModal };
