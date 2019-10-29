import React from 'react';
import PropTypes from 'prop-types';

import Wrapper from './Wrapper';

function PluginHeaderTitle({ title, cta }) {
  const renderCTA = () => {
    if (cta) {
      const { icon, onClick } = cta;
      return <i className={`${icon}`} onClick={onClick} role="button" />;
    }
    return;
  };

  return (
    <Wrapper>
      <h1>
        {title}
        {renderCTA()}
      </h1>
    </Wrapper>
  );
}

PluginHeaderTitle.defaultProps = {
  title: null,
  cta: null,
};

PluginHeaderTitle.propTypes = {
  title: PropTypes.string,
  cta: PropTypes.object,
};

export default PluginHeaderTitle;
