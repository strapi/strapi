import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import openWithNewTab from '../../utils/openWithNewTab';
import { StyledButton } from './components';

const ButtonContainer = ({
  currentDocVersion,
  isHeader,
  onClick,
  onClickDelete,
  version,
}) => {
  if (isHeader) {
    return <div />;
  }

  return (
    <div>
      <StyledButton
        type="openDocumentation"
        onClick={() => openWithNewTab(`/documentation/v${version}`)}
      >
        <FormattedMessage id="documentation.components.Row.open" />
      </StyledButton>
      <StyledButton
        type="generateDocumentation"
        onClick={() => onClick(version)}
      >
        <FormattedMessage id="documentation.components.Row.regenerate" />
      </StyledButton>
      <StyledButton
        type={version === currentDocVersion ? '' : 'trash'}
        onClick={() => onClickDelete(version)}
      />
    </div>
  );
};

ButtonContainer.defaultProps = {
  currentDocVersion: '1.0.0',
  isHeader: false,
  onClick: () => {},
  onClickDelete: () => {},
  version: '',
};

ButtonContainer.propTypes = {
  currentDocVersion: PropTypes.string,
  isHeader: PropTypes.bool,
  onClick: PropTypes.func,
  onClickDelete: PropTypes.func,
  version: PropTypes.string,
};

export default ButtonContainer;
