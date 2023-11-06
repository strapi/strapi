/**
 *
 * AttributeOption
 *
 */

import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import useFormModalNavigation from '../../../hooks/useFormModalNavigation';
import AttributeIcon from '../../AttributeIcon';
import OptionBoxWrapper from '../OptionBoxWrapper';

const CustomFieldOption = ({ customFieldUid, customField }) => {
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

CustomFieldOption.propTypes = {
  customFieldUid: PropTypes.string.isRequired,
  customField: PropTypes.shape({
    type: PropTypes.string.isRequired,
    icon: PropTypes.func,
    intlLabel: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string.isRequired,
    }).isRequired,
    intlDescription: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default CustomFieldOption;
