import { Flex, Typography } from '@strapi/design-system';
import { ArrowRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetInheritanceQuery } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';
import { useSwitchWorkspace } from '../utils/useSwitchWorkspace';
import { WorkspaceChip } from './WorkspaceChip';

interface InheritanceSectionProps {
  model: string;
  documentId: string;
}

const ChipButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius};

  &:hover [data-workspace-chip] {
    background: ${({ theme }) => theme.colors.neutral150};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

/**
 * Which workspaces have taken their own version of this entry.
 *
 * Shown in the default workspace, the only place the question can be answered:
 * a sub-workspace sees one version of the document — its own — and has no
 * business knowing what the others did with it. The workspaces that still read
 * the original are deliberately not listed: they are "everyone else", and
 * naming them turns a short answer into a roll call.
 */
export const InheritanceSection = ({ model, documentId }: InheritanceSectionProps) => {
  const { formatMessage } = useIntl();
  const switchWorkspace = useSwitchWorkspace();
  const { data } = useGetInheritanceQuery({ uid: model, documentIds: [documentId] });
  const summary = data?.[documentId];

  if (!summary?.inherited || summary.overriddenIn.length === 0) {
    return null;
  }

  /**
   * Follow the entry into the workspace that overrode it. The URL is already
   * right — same document — so the workspace is switched and the page reloaded:
   * what the edit view may do with an entry is decided when it mounts, and a
   * version belonging to another workspace is a different set of answers.
   */
  const openIn = (slug: string) => {
    switchWorkspace(slug);
    window.location.reload();
  };

  return (
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Typography variant="pi" textColor="neutral600">
        {formatMessage(
          {
            id: getTranslation('panel.inheritance.overridden'),
            defaultMessage:
              '{count, plural, one {Overridden in} other {Overridden in}} {count, plural, one {# workspace} other {# workspaces}}',
          },
          { count: summary.overriddenIn.length }
        )}
      </Typography>
      <Flex gap={1} wrap="wrap">
        {summary.overriddenIn.map((space) => (
          <ChipButton
            key={space.slug}
            type="button"
            onClick={() => openIn(space.slug)}
            aria-label={formatMessage(
              {
                id: getTranslation('panel.inheritance.open'),
                defaultMessage: 'Open this entry in {name}',
              },
              { name: space.name }
            )}
          >
            <WorkspaceChip space={space} endIcon={<ArrowRight width="1.2rem" />} />
          </ChipButton>
        ))}
      </Flex>
    </Flex>
  );
};
