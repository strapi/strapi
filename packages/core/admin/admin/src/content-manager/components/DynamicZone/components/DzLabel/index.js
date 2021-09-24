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
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Typography } from '@strapi/parts/Text';

const StyledBox = styled(Box)`
  border-radius: ${pxToRem(26)};
`;

const DzLabel = ({ label, labelAction, name, numberOfComponents }) => {
  const { formatMessage } = useIntl();
  const intlLabel = formatMessage({ id: label || name, defaultMessage: label || name });

  return (
    <Row justifyContent="center">
      <Box>
        <StyledBox padding={3} background="neutral0" shadow="filterShadow" color="neutral500">
          <Row>
            <Typography fontSize={0} lineHeight={0} textColor="neutral600" fontWeight="bold">
              {intlLabel}&nbsp;({numberOfComponents})
            </Typography>
            {labelAction && <Box paddingLeft={1}>{labelAction}</Box>}
          </Row>
        </StyledBox>
      </Box>
    </Row>
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
