import React from 'react';
import PropTypes from 'prop-types';
import { upperFirst } from 'lodash';
import CategoryName from './CategoryName';

const Category = ({ categoryName }) => (
  <CategoryName>{upperFirst(categoryName)}</CategoryName>
);

Category.defaultProps = {
  categoryName: '',
};

Category.propTypes = {
  categoryName: PropTypes.string,
};

export default Category;
