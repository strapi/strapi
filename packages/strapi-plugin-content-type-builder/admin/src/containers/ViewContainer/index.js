/**
 *
 * ViewContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  PluginHeader,
  getQueryParameters,
  ViewContainer as StyledViewContainer,
} from 'strapi-helper-plugin';
import LeftMenu from '../LeftMenu';

function ViewContainer({
  children,
  featureType,
  headerTitle,
  headerDescription,
  match: { params },
  onClickIcon,
  pluginHeaderActions,
}) {
  const getFeatureParams = () => {
    return params[`${featureType}Name`];
  };

  const getSource = () => {
    const source = getQueryParameters(getFeatureParams(), 'source');

    /* eslint-disable no-extra-boolean-cast */
    return !!source ? source : null;
  };

  const icon = getSource() ? null : 'fa fa-pencil-alt';

  return (
    <StyledViewContainer>
      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9">
            <div className="components-container">
              <PluginHeader
                description={headerDescription}
                icon={icon}
                title={headerTitle}
                actions={pluginHeaderActions}
                onClickIcon={onClickIcon}
              />
              {children}
            </div>
          </div>
        </div>
      </div>
    </StyledViewContainer>
  );
}

ViewContainer.defaultProps = {
  children: null,
  headerTitle: null,
  headerDescription: null,
  onClickIcon: () => {},
  pluginHeaderActions: [],
};

ViewContainer.propTypes = {
  children: PropTypes.node,
  featureType: PropTypes.string.isRequired,
  headerTitle: PropTypes.string,
  headerDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      values: PropTypes.object,
    }),
  ]),
  match: PropTypes.shape({
    params: PropTypes.object.isRequired,
  }).isRequired,
  onClickIcon: PropTypes.func,
  pluginHeaderActions: PropTypes.array,
};

export default ViewContainer;
