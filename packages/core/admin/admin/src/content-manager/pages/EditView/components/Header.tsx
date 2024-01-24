import { Flex, Status, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { ArrowLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { capitalise } from '../../../../utils/strings';
import { getTranslation } from '../../../utils/translations';

interface HeaderProps {
  isCreating?: boolean;
  status?: 'draft' | 'published' | 'modified';
}

const Header = ({ isCreating, status = 'draft' }: HeaderProps) => {
  const { formatMessage } = useIntl();

  const title = isCreating
    ? formatMessage({
        id: getTranslation('containers.Edit.pluginHeader.title.new'),
        defaultMessage: 'Create an entry',
      })
    : /**
       * TODO: check if the main field is NOT id and use that, otherwise use "Untitled"
       */
      'Unitled';

  const statusVariant =
    status === 'draft' ? 'primary' : status === 'published' ? 'success' : 'alternative';

  return (
    <Flex direction="column" alignItems="flex-start" paddingTop={8} paddingBottom={4} gap={3}>
      {/* TODO: implement back button behaviour, track issue - https://strapi-inc.atlassian.net/browse/CONTENT-2173 */}
      <Link startIcon={<ArrowLeft />}>
        {formatMessage({
          id: 'global.back',
          defaultMessage: 'Back',
        })}
      </Link>
      <Flex paddingTop={1}>
        <Typography variant="alpha" as="h1">
          {title}
        </Typography>
      </Flex>
      <Status showBullet={false} size={'S'} variant={statusVariant}>
        <Typography as="span" variant="omega" fontWeight="bold">
          {capitalise(status)}
        </Typography>
      </Status>
    </Flex>
  );
};

export { Header };
export type { HeaderProps };
