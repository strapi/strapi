import React from 'react';

function connect(WrappedComponent, select) {
  return (props) => {
    // eslint-disable-next-line react/prop-types
    const selectors = select(props.name);

    return <WrappedComponent {...props} {...selectors} />;
  };
}

export default connect;
