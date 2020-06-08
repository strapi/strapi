import React from 'react';
import { createPortal } from 'react-dom';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import styled from 'styled-components';

// No need to create a component here
const Wrapper = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1140;
  /* This color is not in the theme */
  background: #fff;
`;

const MOUNT_NODE = document.getElementById('app') || document.createElement('div');

/*
 *
 * This component is used to show a global loader while permissions are being checked
 * it prevents from lifting the state up in order to avoid setting more logic into the Admin container
 * this way we can show a global loader without modifying the Admin code
 *
 */

const Loader = ({ show }) => {
  if (show) {
    return createPortal(
      <Wrapper>
        <LoadingIndicatorPage />
      </Wrapper>,
      MOUNT_NODE
    );
  }

  return null;
};

Loader.propTypes = {
  show: PropTypes.bool.isRequired,
};

export default Loader;
