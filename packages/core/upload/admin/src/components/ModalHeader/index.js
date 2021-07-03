/*
 * NOTE:
 * This component should be put in the @strapi/helper-plugin
 * at some point so the other packages can benefits from the updates
 *
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ModalHeader as HeaderModal, useTracking } from '@strapi/helper-plugin';

const ModalHeader = ({ goBack, headerBreadcrumbs, withBackButton, HeaderComponent }) => {
  const { trackUsage } = useTracking();

  const handleClick = () => {
    // Track event on the backButton with hardcoded upload location
    trackUsage('didGoBack', { location: 'upload' });

    goBack('backButton');
  };

  return (
    <HeaderModal
      headerBreadcrumbs={headerBreadcrumbs}
      onClickGoBack={handleClick}
      withBackButton={withBackButton}
      HeaderComponent={HeaderComponent}
    />
  );
};

ModalHeader.defaultProps = {
  goBack: () => {},
  headerBreadcrumbs: [],
  withBackButton: false,
  HeaderComponent: null,
};

ModalHeader.propTypes = {
  goBack: PropTypes.func,
  headerBreadcrumbs: PropTypes.array,
  withBackButton: PropTypes.bool,
  HeaderComponent: PropTypes.elementType,
};

export default ModalHeader;
