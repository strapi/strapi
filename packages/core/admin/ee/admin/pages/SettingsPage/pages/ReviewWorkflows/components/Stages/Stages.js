import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box, Stack } from '@strapi/design-system';

import { StageType } from '../../constants';
import { Stage } from './Stage';

const StagesContainer = styled(Box)`
  position: relative;
`;

const Background = styled(Box)`
  left: 50%;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
`;

function Stages({ stages }) {
  return (
    <StagesContainer spacing={4}>
      <Background background="neutral200" height="100%" width={2} zIndex={1} />

      <Stack spacing={6} zIndex={2} position="relative" as="ol">
        {stages.map(({ uid, ...stage }) => (
          <Box key={`stage-${uid}`} as="li">
            <Stage {...{ ...stage, uid }} />
          </Box>
        ))}
      </Stack>
    </StagesContainer>
  );
}

export { Stages };

Stages.defaultProps = {
  stages: [],
};

Stages.propTypes = {
  stages: PropTypes.arrayOf(StageType),
};
