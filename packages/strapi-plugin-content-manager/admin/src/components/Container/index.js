/**
 *
 * Container
 *
 */

import React from 'react';

class Container extends React.Component {
  render() {
    return (
      <div className={`container`}>
        {this.props.children}
      </div>
    );
  }
}

Container.propTypes = {
  children: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.array,
  ]).isRequired,
};

export default Container;
