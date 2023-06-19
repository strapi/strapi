import React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { useTracking } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { addStage } from '../../actions';
import { AddStage } from '../AddStage';

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
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { trackUsage } = useTracking();

  return (
    <Flex direction="column" gap={6} width="100%">
      <StagesContainer spacing={4} width="100%">
        <Background background="neutral200" height="100%" width={2} zIndex={1} />

        <Flex
          direction="column"
          alignItems="stretch"
          gap={6}
          zIndex={2}
          position="relative"
          as="ol"
        >
          {stages.map((stage, index) => {
            const id = stage?.id ?? stage.__temp_key__;

            return (
              <Box key={`stage-${id}`} as="li">
                <Stage
                  id={id}
                  index={index}
                  canDelete={stages.length > 1}
                  isOpen={!stage.id}
                  canReorder={stages.length > 1}
                  stagesCount={stages.length}
                />
              </Box>
            );
          })}
        </Flex>
      </StagesContainer>

      <Flex direction="column" gap={6}>
        <AddStage
          type="button"
          onClick={() => {
            dispatch(addStage({ name: '' }));
            trackUsage('willCreateStage');
          }}
        >
          {formatMessage({
            id: 'Settings.review-workflows.stage.add',
            defaultMessage: 'Add new stage',
          })}
        </AddStage>
      </Flex>
    </Flex>
  );
}

export { Stages };

Stages.defaultProps = {
  stages: [],
};

Stages.propTypes = {
  stages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      __temp_key__: PropTypes.number,
      name: PropTypes.string.isRequired,
    })
  ),
};
