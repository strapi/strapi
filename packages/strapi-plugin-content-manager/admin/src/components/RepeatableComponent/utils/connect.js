import React from 'react';

function connect(WrappedComponent, select) {
  return function(props) {
    const selectors = select();

    return <WrappedComponent {...props} {...selectors} />;
  };
}

export default connect;
