import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { summarize } from '../../utils/summarize';

import type { BuilderConditionV2 } from '../../../../../../shared/builder/types';
import type { BuilderLayout } from '../../../../../../shared/contracts/conditions';

interface SummaryCardProps {
  condition: BuilderConditionV2;
  layout: BuilderLayout;
}

/** The condition in plain English, one sentence per part, as the form has it now */
export const SummaryCard = ({ condition, layout }: SummaryCardProps) => {
  const { formatMessage } = useIntl();
  const sentences = summarize(condition, layout, formatMessage);

  return (
    <Box
      tag="section"
      aria-labelledby="builder-summary-title"
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
    >
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography id="builder-summary-title" variant="delta" tag="h2">
          {formatMessage({
            id: 'end-users.conditions.builder.summary',
            defaultMessage: 'Summary',
          })}
        </Typography>
        {sentences.map((sentence) => (
          <Typography key={sentence} tag="p">
            {sentence}
          </Typography>
        ))}
      </Flex>
    </Box>
  );
};
