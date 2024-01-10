import React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { useTracking } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { Stage as StageType } from '../../../../../../../../shared/contracts/review-workflows';
import { addStage } from '../actions';

import { AddStage } from './AddStage';
import { Stage } from './Stage';

const Background = styled(Box)`
  transform: translateX(-50%);
`;

export type StagesProps = {
  canDelete?: boolean;
  canUpdate?: boolean;
  stages?: StageType[];
};

export const Stages = ({ canDelete = true, canUpdate = true, stages = [] }: StagesProps) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { trackUsage } = useTracking();

  return (
    <Flex direction="column" gap={6} width="100%">
      <Box position="relative" width="100%">
        <Background
          background="neutral200"
          height="100%"
          left="50%"
          position="absolute"
          top="0"
          width={2}
          zIndex={1}
        />

        <Flex
          direction="column"
          alignItems="stretch"
          gap={6}
          zIndex={2}
          position="relative"
          as="ol"
        >
          {stages.map((stage, index) => {
            // @ts-expect-error - temp key should be fixed in order to use another value
            const id = Number(stage?.id ?? stage.__temp_key__);

            return (
              <Box key={`stage-${id}`} as="li">
                <Stage
                  id={id}
                  index={index}
                  isOpen={!stage.id}
                  canDelete={stages.length > 1 && canDelete}
                  canReorder={stages.length > 1}
                  canUpdate={canUpdate}
                  stagesCount={stages.length}
                />
              </Box>
            );
          })}
        </Flex>
      </Box>

      {canUpdate && (
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
      )}
    </Flex>
  );
};
