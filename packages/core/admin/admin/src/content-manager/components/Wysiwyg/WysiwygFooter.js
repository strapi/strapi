import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import Expand from '@strapi/icons/Expand';
import { ExpandButton } from './WysiwygStyles';

const WysiwygFooter = ({ isPreviewMode, onToggleExpand }) => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={2} background="neutral100" hasRadius>
      <Flex justifyContent="flex-end" alignItems="flex-end">
        <ExpandButton id="expand" disabled={isPreviewMode} onClick={onToggleExpand}>
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
  onToggleExpand: () => {},
  isPreviewMode: false,
};

WysiwygFooter.propTypes = {
  onToggleExpand: PropTypes.func,
  isPreviewMode: PropTypes.bool,
};

export default WysiwygFooter;
