/**
 * NotFoundPage
 *
 * This is the page we show when the user visits a url that doesn't have a route
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { NotFound } from 'strapi-helper-plugin';

const NotFoundPage = props => <NotFound {...props} />;

NotFoundPage.propTypes = {
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default NotFoundPage;
