import React from 'react';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { getTrad } from '../../utils';

const EmptyComponent = () => {
  const { formatMessage } = useIntl();

  return (
    <Box paddingTop={7} paddingBottom={7}>
      <Row justifyContent="center">
        <Text textColor="primary600" small bold>
          {formatMessage({
            id: getTrad('components.empty-repeatable'),
            defaultMessage: 'No entry yet. Click on the button below to add one.',
          })}
        </Text>
      </Row>
    </Box>
  );
};

export default EmptyComponent;
