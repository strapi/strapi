import React from 'react';
import PropTypes from 'prop-types';
import UpperFirst from '../UpperFirst';
import ComponentInfosWrapper from './ComponentInfosWrapper';

/* eslint-disable react/jsx-one-expression-per-line */

const ComponentInfos = ({ category, name }) => {
  return (
    <ComponentInfosWrapper>
      &nbsp; (<UpperFirst content={category} /> &nbsp;—&nbsp;
      <UpperFirst content={name} />)
    </ComponentInfosWrapper>
  );
};

ComponentInfos.propTypes = {
  category: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default ComponentInfos;
