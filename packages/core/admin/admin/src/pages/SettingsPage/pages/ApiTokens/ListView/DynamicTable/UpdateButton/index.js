import React from 'react';
import Pencil from '@strapi/icons/Pencil';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Link } from '@strapi/design-system/Link';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

const LinkUpdate = styled(Link)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.neutral800};
      }
    }
  }
`;

const UpdateButton = ({ tokenName, tokenId }) => {
  const { formatMessage } = useIntl();
  const {
    location: { pathname },
  } = useHistory();

  return (
    <LinkUpdate
      to={`${pathname}/${tokenId}`}
      title={formatMessage(
        {
          id: 'app.component.table.edit',
          defaultMessage: 'Edit {target}',
        },
        { target: `${tokenName}` }
      )}
    >
      <Pencil />
    </LinkUpdate>
  );
};

UpdateButton.propTypes = {
  tokenName: PropTypes.string.isRequired,
  tokenId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default UpdateButton;
