import { unstable_tours } from '@strapi/admin/strapi-admin';
import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils/getTrad';

export const EmptyState = () => {
  const { formatMessage } = useIntl();

  const pluginName = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Content-Type Builder',
  });

  return (
    <>
      <unstable_tours.contentTypeBuilder.Introduction>
        {/* Invisible Anchor */}
        <Box paddingTop={5} />
      </unstable_tours.contentTypeBuilder.Introduction>
      <Flex justifyContent="center" alignItems="center" height="100%" direction="column">
        <Typography variant="alpha">{pluginName}</Typography>
        <Typography variant="delta">
          {formatMessage({
            id: getTrad('table.content.create-first-content-type'),
            defaultMessage: 'Create your first Collection-Type',
          })}
        </Typography>
      </Flex>
    </>
  );
};
