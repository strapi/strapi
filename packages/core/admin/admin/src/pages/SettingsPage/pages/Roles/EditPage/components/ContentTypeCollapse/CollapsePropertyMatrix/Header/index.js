import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { cellWidth, firstRowWidth, rowHeight } from '../../../Permissions/utils/constants';

const HeaderLabel = styled(Flex)`
  width: ${cellWidth};
  flex-shrink: 0;
`;
const PropertyLabelWrapper = styled(Flex)`
  width: ${firstRowWidth};
  height: ${rowHeight};
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
    <Flex>
      <PropertyLabelWrapper alignItems="center" paddingLeft={6}>
        <Typography variant="sigma" textColor="neutral500">
          {translatedLabel}
        </Typography>
      </PropertyLabelWrapper>
      {headers.map(header => {
        if (!header.isActionRelatedToCurrentProperty) {
          return <HeaderLabel key={header.label} />;
        }

        return (
          <HeaderLabel justifyContent="center" key={header.label}>
            <Typography variant="sigma" textColor="neutral500">
              {formatMessage({
                id: `Settings.roles.form.permissions.${header.label.toLowerCase()}`,
                defaultMessage: header.label,
              })}
            </Typography>
          </HeaderLabel>
        );
      })}
    </Flex>
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
