/*
 *
 * Official
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import Button from './Button';

function Official(props) {
  return (
    <Button style={props.style}>
      <i className="fa fa-star" />
      <FormattedMessage id="app.components.Official" />
    </Button>
  );
}

Official.defaultProps = {
  style: {},
};

Official.propTypes = {
  style: PropTypes.object,
};

export default Official;
