import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslation } from '../utils/getTranslation';

const Chip = styled(Flex)<{ $color: string | null }>`
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral100};
  border-left: 3px solid ${({ $color, theme }) => $color ?? theme.colors.neutral300};
  gap: ${({ theme }) => theme.spaces[1]};
  width: fit-content;
`;

interface WorkspaceChipProps {
  /** The entry's workspace; `null` = shared with every workspace. */
  space: { slug: string; name: string; color: string | null } | null;
}

/** One entry's workspace, or "Shared" when it belongs to every workspace. */
export const WorkspaceChip = ({ space }: WorkspaceChipProps) => {
  const { formatMessage } = useIntl();

  if (!space) {
    return (
      <Chip $color={null} alignItems="center">
        <Typography variant="pi" textColor="neutral700">
          {formatMessage({ id: getTranslation('entry.shared'), defaultMessage: 'Shared' })}
        </Typography>
      </Chip>
    );
  }

  return (
    <Chip $color={space.color} alignItems="center">
      <Box
        width="6px"
        height="6px"
        borderRadius="50%"
        background={space.color ?? 'neutral300'}
        shrink={0}
      />
      <Typography variant="pi" textColor="neutral700">
        {space.name}
      </Typography>
    </Chip>
  );
};
