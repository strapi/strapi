/**
 *
 * ViewContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import StyledViewContainer from './StyledViewContainer';
import LeftMenu from '../LeftMenu';

import { PluginHeader, getQueryParameters } from 'strapi-helper-plugin';

function ViewContainer({
  children,
  featureType,
  handleClickIcon,
  headerTitle,
  headerDescription,
  pluginHeaderActions,
  match: { params },
}) {
  const getFeatureName = () => {
    return params[`${featureType}Name`].split('&')[0];
  };

  const icon = getQueryParameters(getFeatureName(), 'source')
    ? null
    : 'fa fa-pencil';

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
                onClickIcon={handleClickIcon}
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
  handleClickIcon: () => {},
  pluginHeaderActions: [],
};

ViewContainer.propTypes = {
  children: PropTypes.node,
  featureType: PropTypes.string.isRequired,
  handleClickIcon: PropTypes.func,
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
  pluginHeaderActions: PropTypes.array,
};

export default ViewContainer;
