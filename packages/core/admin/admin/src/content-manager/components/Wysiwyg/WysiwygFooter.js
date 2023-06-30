import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Expand } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { ExpandButton } from './WysiwygStyles';

const WysiwygFooter = ({ onToggleExpand }) => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={2} background="neutral100" hasRadius>
      <Flex justifyContent="flex-end" alignItems="flex-end">
        <ExpandButton id="expand" onClick={onToggleExpand}>
          <Typography>
            {formatMessage({
              id: 'components.WysiwygBottomControls.fullscreen',
              defaultMessage: 'Expand',
            })}
          </Typography>
          <Expand />
        </ExpandButton>
      </Flex>
    </Box>
  );
};

WysiwygFooter.defaultProps = {
  onToggleExpand() {},
};

WysiwygFooter.propTypes = {
  onToggleExpand: PropTypes.func,
};

export default WysiwygFooter;
