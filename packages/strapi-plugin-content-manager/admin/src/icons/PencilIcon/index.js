import React from 'react';
import PropTypes from 'prop-types';

const PencilCompo = ({ fill }) => (
  <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.396 9.155l.6-.6-1.55-1.552-.601.601v.706h.845v.845h.706zM5.848 3.03c0-.097-.048-.146-.145-.146a.153.153 0 0 0-.112.047L2.013 6.508a.153.153 0 0 0-.046.112c0 .097.048.146.145.146a.153.153 0 0 0 .112-.047l3.578-3.577a.153.153 0 0 0 .046-.112zm-.356-1.268l2.746 2.746L2.746 10H0V7.254l5.492-5.492zM10 2.396a.809.809 0 0 1-.244.594L8.66 4.086 5.914 1.34 7.01.25A.784.784 0 0 1 7.604 0a.82.82 0 0 1 .6.25l1.552 1.545a.845.845 0 0 1 .244.601z"
      fill={fill}
      fillRule="nonzero"
    />
  </svg>
);

PencilCompo.defaultProps = {
  fill: '#007EFF',
};

PencilCompo.propTypes = {
  fill: PropTypes.string,
};
