import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetInheritanceQuery } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';
import { WorkspaceChip } from './WorkspaceChip';

interface InheritanceSectionProps {
  model: string;
  documentId: string;
}

/**
 * Who is reading this entry as it is, and who has taken their own copy of it.
 *
 * Shown in the default workspace on a shared entry, which is the only place the
 * question can be answered: a sub-workspace sees one version of the document —
 * its own — and has no business knowing what the others did with it.
 */
export const InheritanceSection = ({ model, documentId }: InheritanceSectionProps) => {
  const { formatMessage } = useIntl();
  const { data } = useGetInheritanceQuery({ uid: model, documentIds: [documentId] });
  const summary = data?.[documentId];

  if (!summary?.inherited) {
    return null;
  }

  const { inheritedIn, overriddenIn } = summary;

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="pi" fontWeight="bold" textColor="neutral600">
        {formatMessage({
          id: getTranslation('panel.inheritance.title'),
          defaultMessage: 'Inheritance',
        })}
      </Typography>

      {inheritedIn.length > 0 ? (
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage(
              {
                id: getTranslation('panel.inheritance.following'),
                defaultMessage:
                  '{count, plural, one {# workspace reads this entry} other {# workspaces read this entry}}',
              },
              { count: inheritedIn.length }
            )}
          </Typography>
          <Flex gap={1} wrap="wrap">
            {inheritedIn.map((space) => (
              <WorkspaceChip key={space.slug} space={space} />
            ))}
          </Flex>
        </Flex>
      ) : null}

      {overriddenIn.length > 0 ? (
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage(
              {
                id: getTranslation('panel.inheritance.overridden'),
                defaultMessage:
                  '{count, plural, one {# workspace has its own version} other {# workspaces have their own version}}',
              },
              { count: overriddenIn.length }
            )}
          </Typography>
          <Flex gap={1} wrap="wrap">
            {overriddenIn.map((space) => (
              <Flex key={space.slug} gap={1} alignItems="center">
                <WorkspaceChip space={space} />
                {space.edited ? (
                  <Typography variant="pi" textColor="neutral500">
                    {formatMessage({
                      id: getTranslation('panel.inheritance.edited'),
                      defaultMessage: '(edited)',
                    })}
                  </Typography>
                ) : null}
              </Flex>
            ))}
          </Flex>
        </Flex>
      ) : (
        <Box>
          <Typography variant="pi" textColor="neutral500">
            {formatMessage({
              id: getTranslation('panel.inheritance.none'),
              defaultMessage: 'No workspace has overridden it.',
            })}
          </Typography>
        </Box>
      )}
    </Flex>
  );
};
