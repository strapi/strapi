import { Box, Flex, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils/getTrad';

const CloudFree = () => {
  const { formatMessage } = useIntl();

  const features = [
    { id: 'api', message: '2.5K API requests' },
    { id: 'storage', message: '10 GB storage' },
    { id: 'bandwidth', message: '10 GB asset bandwidth' },
    { id: 'cdn', message: 'Global CDN' },
    { id: 'pushToDeploy', message: 'Push to deploy' },
  ];

  return (
    <Box>
      <Box paddingBottom={10}>
        <Flex direction="column">
          <Flex direction="row" wrap="wrap">
            {features.map(({ id, message }) => (
              <Flex key={id} paddingRight={5}>
                <Check fill="primary500" />
                <Typography variant="omega" paddingLeft={1}>
                  {formatMessage({
                    id: getTrad(`Homepage.freePlan.${id}`),
                    defaultMessage: message,
                  })}
                </Typography>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};

export { CloudFree };
