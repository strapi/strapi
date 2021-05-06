import React from 'react';
import PropTypes from 'prop-types';

const Button = ({ elapsed }) => {
  if (elapsed > 15) {
    return null;
  }

  return (
    <div className="buttonContainer">
      <a
        className="primary btn"
        href="https://strapi.io/documentation"
        target="_blank"
        rel="noopener noreferrer"
      >
        Read the documentation
      </a>
    </div>
  );
};

Button.propTypes = {
  elapsed: PropTypes.number.isRequired,
};

export default Button;
