import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFormModalNavigation } from '../../hooks/useFormModalNavigation';
import { AttributeIcon, IconByType } from '../AttributeIcon';

import { OptionBoxWrapper } from './OptionBoxWrapper';

import type { CustomFieldUID } from '@strapi/helper-plugin';

export type CustomFieldOption = {
  name: string;
  type: IconByType;
  icon: React.ComponentType;
  intlLabel: {
    id: string;
    defaultMessage: string;
  };
  intlDescription: {
    id: string;
    defaultMessage: string;
  };
};

type CustomFieldOptionProps = {
  customFieldUid: CustomFieldUID;
  customField: CustomFieldOption;
};

export const CustomFieldOption = ({ customFieldUid, customField }: CustomFieldOptionProps) => {
  const { type, intlLabel, intlDescription } = customField;
  const { formatMessage } = useIntl();

  const { onClickSelectCustomField } = useFormModalNavigation();

  const handleClick = () => {
    onClickSelectCustomField({
      attributeType: type,
      customFieldUid,
    });
  };

  return (
    <OptionBoxWrapper padding={4} as="button" hasRadius type="button" onClick={handleClick}>
      <Flex>
        <AttributeIcon type={type} customField={customFieldUid} />
        <Box paddingLeft={4}>
          <Flex>
            <Typography fontWeight="bold">{formatMessage(intlLabel)}</Typography>
          </Flex>
          <Flex>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage(intlDescription)}
            </Typography>
          </Flex>
        </Box>
      </Flex>
    </OptionBoxWrapper>
  );
};
