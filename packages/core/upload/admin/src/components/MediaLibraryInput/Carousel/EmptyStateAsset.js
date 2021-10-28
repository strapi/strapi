import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Icon } from '@strapi/parts/Icon';
import { Flex } from '@strapi/parts/Flex';
import { Text } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import AddAsset from '@strapi/icons/AddAsset';
import getTrad from '../../../utils/getTrad';

export const EmptyStateAsset = ({ disabled, onClick }) => {
  const { formatMessage } = useIntl();

  return (
    <Box position="relative" height="100%" width="100%">
      <Flex
        direction="column"
        justifyContent="center"
        alignItems="center"
        height="100%"
        width="100%"
        as="button"
        type="button"
        onClick={onClick}
      >
        <Icon
          as={AddAsset}
          aria-hidden
          width="30px"
          height="24px"
          color={disabled ? 'neutral400' : 'primary600'}
          marginBottom={3}
        />
        <Text small bold textColor="neutral600" style={{ textAlign: 'center' }} as="span">
          {formatMessage({
            id: getTrad('mediaLibraryInput.placeholder'),
            defaultMessage: 'Click to select an asset or drag and drop one in this area',
          })}
        </Text>
      </Flex>
    </Box>
  );
};

EmptyStateAsset.defaultProps = {
  disabled: false,
};

EmptyStateAsset.propTypes = {
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};
