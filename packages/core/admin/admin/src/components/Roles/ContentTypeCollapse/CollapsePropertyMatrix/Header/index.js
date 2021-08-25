import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Row, TableLabel } from '@strapi/parts';
import styled from 'styled-components';
import { cellWidth, firstRowWidth } from '../../../Permissions/utils/constants';

const HeaderLabel = styled(Row)`
  width: ${cellWidth};
  flex-shrink: 0;
`;
const PropertyLabelWrapper = styled(Row)`
  width: ${firstRowWidth};
  height: ${52 / 16}rem;
  flex-shrink: 0;
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
      <PropertyLabelWrapper alignItems="center" paddingLeft={6}>
        <TableLabel textColor="neutral500">{translatedLabel}</TableLabel>
      </PropertyLabelWrapper>
      {headers.map(header => {
        if (!header.isActionRelatedToCurrentProperty) {
          return <HeaderLabel key={header.label} />;
        }

        return (
          <HeaderLabel justifyContent="center" key={header.label}>
            <TableLabel textColor="neutral500">
              {formatMessage({
                id: `Settings.roles.form.permissions.${header.label.toLowerCase()}`,
                defaultMessage: header.label,
              })}
            </TableLabel>
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
