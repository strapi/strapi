import { Flex, Typography } from '@strapi/design-system';
import { Lock } from '@strapi/icons';

import { firstRowWidth, rowHeight } from '../utils/constants';

import type { SubjectLockedRow } from '../../../../../../../shared/contracts/permissions';

interface LockedRowsProps {
  rows: SubjectLockedRow[];
  /**
   * How many rows come before these in the matrix, to carry on its striping.
   */
  rowsBefore?: number;
}

/**
 * Properties the role never sets: a row with the reason, and no checkbox.
 */
const LockedRows = ({ rows, rowsBefore = 0 }: LockedRowsProps) => (
  <>
    {rows.map(({ label, note }, index) => (
      <Flex
        key={label}
        alignItems="center"
        height={rowHeight}
        background={(rowsBefore + index) % 2 === 0 ? 'neutral100' : 'neutral0'}
      >
        <Flex
          alignItems="center"
          gap={2}
          paddingLeft={6}
          paddingRight={2}
          width={firstRowWidth}
          shrink={0}
        >
          <Lock width="1.4rem" height="1.4rem" fill="neutral600" />
          <Typography textColor="neutral600" ellipsis>
            {label}
          </Typography>
        </Flex>
        <Typography variant="pi" textColor="neutral600">
          {note}
        </Typography>
      </Flex>
    ))}
  </>
);

export { LockedRows };
export type { LockedRowsProps };
