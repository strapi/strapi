import React from 'react';

import { Link } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

const MESSAGES_MAP = {
  edit: {
    id: 'app.component.table.edit',
    defaultMessage: 'Edit {target}',
  },
  read: {
    id: 'app.component.table.read',
    defaultMessage: 'Read {target}',
  },
};

const LinkStyled = styled(Link)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover,
  &:focus {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.neutral800};
      }
    }
  }
`;

const DefaultButton = ({ tokenName, tokenId, buttonType, children }) => {
  const { formatMessage } = useIntl();
  const {
    location: { pathname },
  } = useHistory();

  return (
    <LinkStyled
      to={`${pathname}/${tokenId}`}
      title={formatMessage(MESSAGES_MAP[buttonType], { target: tokenName })}
    >
      {children}
    </LinkStyled>
  );
};

DefaultButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  tokenId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  buttonType: PropTypes.string,
  children: PropTypes.node.isRequired,
};

DefaultButton.defaultProps = {
  buttonType: 'edit',
};

export default DefaultButton;
