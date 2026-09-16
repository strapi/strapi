import { Badge, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { useDocumentSpace } from '../hooks/useDocumentSpace';
import { getTranslation } from '../utils/getTranslation';

interface SpaceListCellProps {
  documentId: string;
}

/**
 * Which space an entry belongs to.
 *
 * Only added in the all-spaces view: inside a space the column would say the
 * same thing on every row.
 */
const SpaceListCell = ({ documentId }: SpaceListCellProps) => {
  const { formatMessage } = useIntl();
  // The Content Manager routes name the content type in the URL, and the list
  // layout does not carry it, so this is where the cell learns what it is
  // looking at.
  const { slug } = useParams<{ slug: string }>();
  const space = useDocumentSpace(slug ?? '', documentId);

  if (!slug || space === undefined) {
    return null;
  }

  if (space === null) {
    return (
      <Badge textColor="neutral600" backgroundColor="neutral150">
        {formatMessage({
          id: getTranslation('list.shared'),
          defaultMessage: 'Shared',
        })}
      </Badge>
    );
  }

  return (
    <Typography textColor="neutral800" ellipsis>
      {space.name}
    </Typography>
  );
};

export { SpaceListCell };
