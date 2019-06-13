/**
 *
 * ViewContainer
 *
 */

import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { get, isEqual, pickBy } from 'lodash';

import StyledViewContainer from './StyledViewContainer';
import LeftMenu from '../LeftMenu';
import MenuContext from '../MenuContext';

import {
  Button,
  EmptyAttributesBlock,
  PluginHeader,
  PopUpWarning,
  routerPropTypes,
  getQueryParameters,
} from 'strapi-helper-plugin';

function ViewContainer(props) {
  const {
    children,
    featureType,

    match: { params },
  } = props;
  const { canOpenModal, groups, models, push } = useContext(MenuContext);
  const getFeatureName = () => {
    return params[`${featureType}Name`].split('&')[0];
  };

  const getPluginHeaderTitle = () => {
    const { newContentType, modifiedData } = props;
    const name = getFeatureName();

    /* istanbul ignore if */
    const title = isUpdatingTempFeature()
      ? get(newContentType, 'name', null)
      : get(modifiedData, [name, 'name'], null);

    return title;
  };

  const isUpdatingTempFeature = () => {
    const isGroup = featureType === 'group';
    const data = isGroup ? groups : models;
    const currentData = data.find(d => {
      if (isGroup) {
        return d.uid === getFeatureName();
      }

      return d.name === getFeatureName();
    });

    return get(currentData, 'isTemporary', false);
  };

  const getSource = () => {
    const source = getQueryParameters(getFeatureName(), 'source');

    return !!source ? source : null;
  };
  const icon = getSource() ? null : 'fa fa-pencil';

  return (
    <StyledViewContainer>
      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9">
            <div className="components-container">
              {getSource()}
              <PluginHeader
                // description={this.getModelDescription()}
                icon={icon}
                title={getPluginHeaderTitle()}
                // actions={this.getPluginHeaderActions()}
                // onClickIcon={this.handleClickEditModelMainInfos}
              />
              <p>YOYO</p>
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
};

ViewContainer.propTypes = {
  children: PropTypes.node,
};

export default ViewContainer;
