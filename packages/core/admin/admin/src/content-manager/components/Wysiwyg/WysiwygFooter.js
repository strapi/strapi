import React from 'react';
import PropTypes from 'prop-types';
import { Row, Text, Box } from '@strapi/parts';
import { Expand } from '@strapi/icons';
import { ExpandButton } from './WysiwygStyles';

const WysiwygFooter = ({ isPreviewMode, onToggleExpand }) => {
  return (
    <Box padding={2} background="neutral100" hasRadius>
      <Row justifyContent="flex-end" alignItems="flex-end">
        <ExpandButton id="expand" disabled={isPreviewMode} onClick={onToggleExpand}>
          <Text>Expand</Text>
          <Expand />
        </ExpandButton>
      </Row>
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
