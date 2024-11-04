import { Status, StatusProps, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { capitalise } from '../../../utils/strings';

interface DocumentStatusProps extends Omit<StatusProps, 'children' | 'size' | 'variant'> {
  /**
   * The status of the document (draft, published, etc.)
   * @default 'draft'
   */
  status?: string;
}

/**
 * @internal
 * @description Displays the status of a document (draft, published, etc.)
 * and automatically calculates the appropriate variant for the status.
 */
const DocumentStatus = ({ status = 'draft', ...restProps }: DocumentStatusProps) => {
  const statusVariant =
    status === 'draft' ? 'secondary' : status === 'published' ? 'success' : 'alternative';

  const { formatMessage } = useIntl();

  return (
    <Status {...restProps} size={'S'} variant={statusVariant}>
      <Typography tag="span" variant="omega" fontWeight="bold">
        {formatMessage({
          id: `content-manager.containers.List.${status}`,
          defaultMessage: capitalise(status),
        })}
      </Typography>
    </Status>
  );
};

export { DocumentStatus };
export type { DocumentStatusProps };
