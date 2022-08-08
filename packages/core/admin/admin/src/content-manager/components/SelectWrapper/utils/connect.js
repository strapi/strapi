import React from 'react';

function connect(WrappedComponent, select) {
  return function (props) {
    // eslint-disable-next-line react/prop-types
    const selectors = select(props);

    return <WrappedComponent {...props} {...selectors} />;
  };
}

export default connect;
