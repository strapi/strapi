import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { IS_ACTIVE, IS_DONE, IS_NOT_DONE } from '../../constants';
import StepLine from '../../Stepper/StepLine';
import StepNumber from '../../Stepper/StepNumber';

const StepHomepage = ({ type, title, number, content, hasLine }) => {
  const { formatMessage } = useIntl();

  return (
    <Box>
      <Flex>
        <Box minWidth={pxToRem(30)} marginRight={5}>
          <StepNumber type={type} number={number} />
        </Box>
        <Typography variant="delta" as="h3">
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Flex alignItems="flex-start">
        <Flex
          justifyContent="center"
          minWidth={pxToRem(30)}
          marginBottom={3}
          marginTop={3}
          marginRight={5}
        >
          {hasLine && (
            <StepLine type={type} minHeight={type === IS_ACTIVE ? pxToRem(85) : pxToRem(65)} />
          )}
        </Flex>
        <Box marginTop={2}>{type === IS_ACTIVE && content}</Box>
      </Flex>
    </Box>
  );
};

StepHomepage.defaultProps = {
  content: undefined,
  number: undefined,
  type: IS_NOT_DONE,
  hasLine: true,
};

StepHomepage.propTypes = {
  content: PropTypes.node,
  number: PropTypes.number,
  title: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }).isRequired,
  type: PropTypes.oneOf([IS_ACTIVE, IS_DONE, IS_NOT_DONE]),
  hasLine: PropTypes.bool,
};

export default StepHomepage;
