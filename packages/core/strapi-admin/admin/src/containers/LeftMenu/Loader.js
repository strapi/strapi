/*
 *
 * This component is used to show a global loader while permissions are being checked
 * it prevents from lifting the state up in order to avoid setting more logic into the Admin container
 * this way we can show a global loader without modifying the Admin code
 *
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import LoaderWrapper from './LoaderWrapper';

const MOUNT_NODE = document.getElementById('app') || document.createElement('div');

const Loader = ({ show }) => {
  if (show) {
    return createPortal(
      <LoaderWrapper>
        <LoadingIndicatorPage />
      </LoaderWrapper>,
      MOUNT_NODE
    );
  }

  return null;
};

Loader.propTypes = {
  show: PropTypes.bool.isRequired,
};

export default Loader;
