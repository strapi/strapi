/* eslint-disable react/no-danger */
/**
 *
 * PreviewWysiwyg
 *
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';

import md from './utils/mdRenderer';
import sanitizeHtml from './utils/satinizeHtml';
import Wrapper from './Wrapper';

const PreviewWysiwyg = ({ data }) => {
  const html = useMemo(() => sanitizeHtml(md.render(data.replaceAll('\\n', '\n') || '')), [data]);

  return (
    <Wrapper>
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
