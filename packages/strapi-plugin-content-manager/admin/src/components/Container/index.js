/**
 *
 * Container
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

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
  children: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]).isRequired,
};

export default Container;
