/*
 * NOTE:
 * This component should be put in the strapi-helper-plugin
 * at some point so the other packages can benefits from the updates
 *
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ModalHeader as HeaderModal, useGlobalContext } from 'strapi-helper-plugin';

const ModalHeader = ({ goBack, headerBreadcrumbs, withBackButton, HeaderComponent }) => {
  const { emitEvent } = useGlobalContext();

  const handleClick = () => {
    // Emit event on backButton with hardcoded upload location
    emitEvent('didGoBack', { location: 'upload' });

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
