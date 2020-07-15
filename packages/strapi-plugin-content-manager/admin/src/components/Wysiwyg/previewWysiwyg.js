/**
 *
 * PreviewWysiwyg
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown/with-html';
import useWysiwyg from '../../hooks/useWysiwyg';

import PreviewWysiwygWrapper from './PreviewWysiwygWrapper';

const PreviewWysiwyg = ({ data }) => {
  const { isFullscreen } = useWysiwyg;

  return (
    <PreviewWysiwygWrapper isFullscreen={isFullscreen}>
      <ReactMarkdown source={data} skipHtml={false} escapeHtml={false} />
    </PreviewWysiwygWrapper>
  );
};

PreviewWysiwyg.defaultProps = {
  data: '',
};

PreviewWysiwyg.propTypes = {
  data: PropTypes.string,
};

export default memo(PreviewWysiwyg);
