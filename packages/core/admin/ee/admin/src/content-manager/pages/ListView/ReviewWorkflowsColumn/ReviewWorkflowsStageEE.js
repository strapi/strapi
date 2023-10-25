import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

import { STAGE_COLOR_DEFAULT } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/constants';
import { getStageColorByHex } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/utils/colors';

export function ReviewWorkflowsStageEE({ color, name }) {
  const { themeColorName } = getStageColorByHex(color);

  return (
    <Flex alignItems="center" gap={2} maxWidth={pxToRem(300)}>
      <Box
        height={2}
        background={color}
        borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
        hasRadius
        shrink={0}
        width={2}
      />

      <Typography fontWeight="regular" textColor="neutral700" ellipsis>
        {name}
      </Typography>
    </Flex>
  );
}

ReviewWorkflowsStageEE.defaultProps = {
  color: STAGE_COLOR_DEFAULT,
};

ReviewWorkflowsStageEE.propTypes = {
  color: PropTypes.string,
  name: PropTypes.string.isRequired,
};
