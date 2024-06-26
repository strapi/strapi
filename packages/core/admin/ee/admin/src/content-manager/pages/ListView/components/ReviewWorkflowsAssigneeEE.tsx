import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getDisplayName } from '../../../../../../../admin/src/content-manager/utils/users';
import { SanitizedAdminUser } from '../../../../../../../shared/contracts/shared';

interface ReviewWorkflowsAssigneeEEProps {
  user: Pick<SanitizedAdminUser, 'firstname' | 'lastname' | 'username' | 'email'>;
}

const ReviewWorkflowsAssigneeEE = ({ user }: ReviewWorkflowsAssigneeEEProps) => {
  const { formatMessage } = useIntl();

  return <Typography textColor="neutral800">{getDisplayName(user, formatMessage)}</Typography>;
};

export { ReviewWorkflowsAssigneeEE };
export type { ReviewWorkflowsAssigneeEEProps };
