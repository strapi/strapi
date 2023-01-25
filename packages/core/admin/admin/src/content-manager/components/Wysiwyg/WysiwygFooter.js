import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex, Typography } from '@strapi/design-system';
import { Expand } from '@strapi/icons';

import { ExpandButton } from './WysiwygStyles';

const WysiwygFooter = ({ onToggleExpand }) => {
  const { formatMessage } = useIntl();

  return (
    <Flex
      justifyContent="flex-end"
      alignItems="flex-end"
      padding={2}
      background="neutral100"
      hasRadius
    >
      <ExpandButton onClick={onToggleExpand}>
        <Typography>
          {formatMessage({
            id: 'components.WysiwygBottomControls.fullscreen',
            defaultMessage: 'Expand',
          })}
        </Typography>
        <Expand />
      </ExpandButton>
    </Flex>
  );
};

WysiwygFooter.defaultProps = {
  onToggleExpand() {},
};

WysiwygFooter.propTypes = {
  onToggleExpand: PropTypes.func,
};

export default WysiwygFooter;
