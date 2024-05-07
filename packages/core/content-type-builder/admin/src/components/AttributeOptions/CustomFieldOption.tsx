import * as React from 'react';

import { StrapiAppContextValue } from '@strapi/admin/strapi-admin';
import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFormModalNavigation } from '../../hooks/useFormModalNavigation';
import { AttributeIcon, IconByType } from '../AttributeIcon';

import { OptionBoxWrapper } from './OptionBoxWrapper';

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
  customFieldUid: string;
  customField: NonNullable<ReturnType<StrapiAppContextValue['customFields']['get']>>;
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
    <OptionBoxWrapper padding={4} tag="button" hasRadius type="button" onClick={handleClick}>
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
