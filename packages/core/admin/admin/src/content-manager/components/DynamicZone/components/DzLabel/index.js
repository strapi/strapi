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
import { Typography } from '@strapi/design-system/Text';

const StyledBox = styled(Box)`
  border-radius: ${pxToRem(26)};
`;

const DzLabel = ({ label, labelAction, name, numberOfComponents }) => {
  const { formatMessage } = useIntl();
  const intlLabel = formatMessage({ id: label || name, defaultMessage: label || name });

  return (
    <Flex justifyContent="center">
      <Box>
        <StyledBox padding={3} background="neutral0" shadow="filterShadow" color="neutral500">
          <Flex>
            <Typography fontSize={0} lineHeight={0} textColor="neutral600" fontWeight="bold">
              {intlLabel}&nbsp;({numberOfComponents})
            </Typography>
            {labelAction && <Box paddingLeft={1}>{labelAction}</Box>}
          </Flex>
        </StyledBox>
      </Box>
    </Flex>
  );
};

DzLabel.defaultProps = {
  label: '',
  labelAction: undefined,
};

DzLabel.propTypes = {
  label: PropTypes.string,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  numberOfComponents: PropTypes.number.isRequired,
};

export default DzLabel;
