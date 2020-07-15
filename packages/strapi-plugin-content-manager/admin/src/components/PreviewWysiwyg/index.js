/**
 *
 * PreviewWysiwyg
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown/with-html';
import useWysiwyg from '../../hooks/useWysiwyg';
import Wrapper from './Wrapper';

const PreviewWysiwyg = ({ data }) => {
  const { isFullscreen } = useWysiwyg;

  return (
    <Wrapper isFullscreen={isFullscreen}>
      <ReactMarkdown source={data} skipHtml={false} escapeHtml={false} />
    </Wrapper>
  );
};

PreviewWysiwyg.defaultProps = {
  data: '',
};

PreviewWysiwyg.propTypes = {
  data: PropTypes.string,
};

export default memo(PreviewWysiwyg);
