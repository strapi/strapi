import React from 'react';

function connect(WrappedComponent, select) {
  return (props) => {
    const selectors = select(props);

    return <WrappedComponent {...props} {...selectors} />;
  };
}

export default connect;
