import React from 'react';
import PropTypes from 'prop-types';

import Wrapper from './Wrapper';

function PluginHeader({ title, content, callToAction }) {
  return (
    <Wrapper>
      <div className="row">
        <div className="col-lg-6 header-title">
          {title}
          {content}
        </div>
        <div className="col-lg-6 justify-content-end">{callToAction}</div>
      </div>
    </Wrapper>
  );
}

PluginHeader.defaultProps = {
  title: null,
  content: null,
  callToAction: null,
};

PluginHeader.propTypes = {
  title: PropTypes.node,
  content: PropTypes.node,
  callToAction: PropTypes.node,
};

export default PluginHeader;
