/**
 *
 * AttributeOption
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import OptionBoxWrapper from '../OptionBoxWrapper';
import AttributeIcon, { IconBox } from '../../AttributeIcon';
import useFormModalNavigation from '../../../hooks/useFormModalNavigation';

const CustomFieldOption = ({ uid, customField }) => {
  const { type, icon, intlLabel, intlDescription } = customField;
  const { formatMessage } = useIntl();

  const { onClickSelectCustomField } = useFormModalNavigation();

  const handleClick = () => {
    onClickSelectCustomField({
      attributeType: type,
      customFieldUid: uid,
    });
  };

  return (
    <OptionBoxWrapper padding={4} as="button" hasRadius type="button" onClick={handleClick}>
      <Flex>
        {icon ? <IconBox as={icon} /> : <AttributeIcon type={type} />}
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
  uid: PropTypes.string.isRequired,
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
