import React, { useMemo, memo } from 'react';
import PropTypes from 'prop-types';

const InputLoader = ({ component, ...props }) => {
  const LazyComponent = useMemo(() => React.lazy(component), [component]);

  return <LazyComponent {...props} />;
};

InputLoader.propTypes = {
  component: PropTypes.func.isRequired,
};

export default memo(InputLoader);
