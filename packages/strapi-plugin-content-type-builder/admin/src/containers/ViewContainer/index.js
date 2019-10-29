/**
 *
 * ViewContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ViewContainer as StyledViewContainer } from 'strapi-helper-plugin';
import LeftMenu from '../LeftMenu';

function ViewContainer({ children }) {
  return (
    <StyledViewContainer>
      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9">
            <div className="components-container">{children}</div>
          </div>
        </div>
      </div>
    </StyledViewContainer>
  );
}

ViewContainer.defaultProps = {
  children: null,
};

ViewContainer.propTypes = {
  children: PropTypes.node,
};

export default ViewContainer;
