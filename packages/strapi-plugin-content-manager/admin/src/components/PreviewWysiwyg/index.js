/* eslint-disable react/no-danger */
/**
 *
 * PreviewWysiwyg
 *
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import useWysiwyg from '../../hooks/useWysiwyg';
import md from './utils/mdRenderer';
import Wrapper from './Wrapper';

const PreviewWysiwyg = ({ data }) => {
  const { isFullscreen } = useWysiwyg();
  const html = useMemo(() => md.render(data || ''), [data]);

  return (
    <Wrapper isFullscreen={isFullscreen}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
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
