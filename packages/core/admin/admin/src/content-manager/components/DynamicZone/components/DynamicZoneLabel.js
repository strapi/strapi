/**
 *
 * DzLabel
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { pxToRem } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';

const StyledBox = styled(Box)`
  border-radius: ${pxToRem(26)};
`;

const DynamicZoneLabel = ({
  label,
  labelAction,
  name,
  numberOfComponents,
  required,
  intlDescription,
}) => {
  const { formatMessage } = useIntl();
  const intlLabel = formatMessage({ id: label || name, defaultMessage: label || name });

  return (
    <Flex justifyContent="center">
      <Box>
        <StyledBox
          paddingTop={3}
          paddingBottom={3}
          paddingRight={4}
          paddingLeft={4}
          background="neutral0"
          shadow="filterShadow"
          color="neutral500"
        >
          <Flex direction="column" justifyContent="center">
            <Flex maxWidth={pxToRem(356)}>
              <Typography variant="pi" textColor="neutral600" fontWeight="bold" ellipsis>
                {intlLabel}&nbsp;
              </Typography>
              <Typography variant="pi" textColor="neutral600" fontWeight="bold">
                ({numberOfComponents})
              </Typography>
              {required && <Typography textColor="danger600">*</Typography>}
              {labelAction && <Box paddingLeft={1}>{labelAction}</Box>}
            </Flex>
            {intlDescription && (
              <Box paddingTop={1} maxWidth={pxToRem(356)}>
                <Typography variant="pi" textColor="neutral600" ellipsis>
                  {formatMessage(intlDescription)}
                </Typography>
              </Box>
            )}
          </Flex>
        </StyledBox>
      </Box>
    </Flex>
  );
};

DynamicZoneLabel.defaultProps = {
  intlDescription: undefined,
  label: '',
  labelAction: undefined,
  numberOfComponents: 0,
  required: false,
};

DynamicZoneLabel.propTypes = {
  intlDescription: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }),
  label: PropTypes.string,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  numberOfComponents: PropTypes.number,
  required: PropTypes.bool,
};

export default DynamicZoneLabel;
