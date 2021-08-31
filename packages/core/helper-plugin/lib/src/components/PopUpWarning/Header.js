import React from 'react';
import { FormattedMessage } from 'react-intl';
import Close from '../../svgs/Close';
import CloseButton from './CloseButton';
import StyledHeader from './StyledHeader';

const Header = ({ onClick, title, children }) => {
  return (
    <>
      <CloseButton onClick={onClick}>
        <Close fill="#c3c5c8" />
      </CloseButton>
      <StyledHeader toggle={onClick}>
        {children || <FormattedMessage id={title || 'components.popUpWarning.title'} />}
      </StyledHeader>
    </>
  );
};

export default Header;
