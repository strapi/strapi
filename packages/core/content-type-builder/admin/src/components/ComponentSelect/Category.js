import React from 'react';
import PropTypes from 'prop-types';
import UpperFirst from '../UpperFirst';
import CategoryName from './CategoryName';

const Category = ({ categoryName }) => (
  <CategoryName>
    <UpperFirst content={categoryName} />
  </CategoryName>
);

Category.defaultProps = {
  categoryName: '',
};

Category.propTypes = {
  categoryName: PropTypes.string,
};

export default Category;
