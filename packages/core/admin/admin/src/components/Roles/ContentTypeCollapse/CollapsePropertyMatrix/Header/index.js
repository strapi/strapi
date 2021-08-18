import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Row, Box } from '@strapi/parts';
import styled from 'styled-components';
import { cellWidth, firstRowWidth } from '../../../Permissions/utils/constants';
// Those styles are very specific.
// so it is not a big problem to use custom paddings and widths.
const HeaderLabel = styled.div`
  justify-content: center;
  display: flex;
  width: ${cellWidth};
`;
const PropertyLabelWrapper = styled.div`
  width: ${firstRowWidth};
  display: flex;
  align-items: center;
  padding-left: ${({ theme }) => theme.spaces[6]};
  height: 52px;
`;

const Label = styled(Box)`
  font-size: ${11 / 16}rem;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.neutral500};
  font-weight: bold;
`;

const Header = ({ headers, label }) => {
  const { formatMessage } = useIntl();
  const translatedLabel = formatMessage(
    {
      id: 'Settings.roles.form.permission.property-label',
      defaultMessage: '{label} permissions',
    },
    { label }
  );

  return (
    <Row>
      <PropertyLabelWrapper>
        <Label>{translatedLabel}</Label>
      </PropertyLabelWrapper>
      {headers.map(header => {
        if (!header.isActionRelatedToCurrentProperty) {
          return <HeaderLabel key={header.label} />;
        }

        return (
          <HeaderLabel key={header.label}>
            <Label>
              {formatMessage({
                id: `Settings.roles.form.permissions.${header.label.toLowerCase()}`,
                defaultMessage: header.label,
              })}
            </Label>
          </HeaderLabel>
        );
      })}
    </Row>
  );
};

Header.propTypes = {
  headers: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      isActionRelatedToCurrentProperty: PropTypes.bool.isRequired,
    })
  ).isRequired,
  label: PropTypes.string.isRequired,
};

export default Header;
