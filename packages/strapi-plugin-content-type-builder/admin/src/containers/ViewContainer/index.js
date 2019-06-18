/**
 *
 * ViewContainer
 *
 */

import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { get, isEqual, capitalize } from 'lodash';

import pluginId from '../../pluginId';

import StyledViewContainer from './StyledViewContainer';
import LeftMenu from '../LeftMenu';
import MenuContext from '../MenuContext';
import AttributesModalPicker from '../AttributesPickerModal';

import {
  EmptyAttributesBlock,
  PluginHeader,
  getQueryParameters,
} from 'strapi-helper-plugin';

function ViewContainer(props, context) {
  const { groups, models } = useContext(MenuContext);
  const {
    canOpenModal,
    children,
    featureData,
    featureType,
    history: { push },
    location: { pathname, search },
    modifiedData,
    match: { params },
    newFeature,
    resetExistingFeatureMainInfos,
    tempData,
    removePrompt,
  } = props;

  const displayNotificationCTNotSaved = () =>
    strapi.notification.info(
      `${pluginId}.notification.info.contentType.creating.notSaved`
    );

  const getFeatureName = () => {
    return params[`${featureType}Name`].split('&')[0];
  };

  const getSource = () => {
    const source = getQueryParameters(getFeatureName(), 'source');

    return !!source ? source : null;
  };

  const getCurrentData = () => {
    const name = getFeatureName();

    return isUpdatingTempFeature() ? tempData : get(modifiedData, name, {});
  };

  const getModalType = () => getQueryParameters(search, 'modalType');

  const getFeature = () => {
    if (isUpdatingTempFeature()) {
      return newFeature;
    }

    return get(modifiedData, getFeatureName(), {});
  };
  const getFeatureAttributes = () => get(getFeature(), 'attributes', {});

  const getFeatureAttributesLength = () =>
    Object.keys(getFeatureAttributes()).length;

  const getPluginHeaderActions = () => {
    /* istanbul ignore if */
    const shouldShowActions = isUpdatingTempFeature()
      ? getFeatureAttributesLength() > 0
      : !isEqual(modifiedData[getFeatureName()], featureData[getFeatureName()]);
    /* eslint-disable indent */
    const handleSubmit = isUpdatingTempFeature()
      ? () => submitTempFeature(newFeature, context)
      : () => {
          submitFeature(
            getFeatureName(),
            get(modifiedData, getFeatureName()),
            Object.assign(context, {
              history: props.history,
            }),
            getSource()
          );
        };
    /* istanbul ignore next */
    // const handleCancel = isUpdatingTempFeature()
    //   ? resetEditTempFeature
    //   : () => resetEditExistingFeature(getFeatureName());
    /* eslint-enable indent */

    /* istanbul ignore if */
    if (shouldShowActions) {
      return [
        {
          label: `${pluginId}.form.button.cancel`,
          onClick: handleCancel,
          kind: 'secondary',
          type: 'button',
        },
        {
          label: `${pluginId}.form.button.save`,
          onClick: handleSubmit,
          kind: 'primary',
          type: 'submit',
          id: 'saveData',
        },
      ];
    }

    return [];
  };

  const handleClickIcon = async () => {
    const { emitEvent } = context;
    await wait();

    if (canOpenModal || isUpdatingTempFeature()) {
      push({
        pathname,
        search: `modalType=${featureType}&settingType=base&actionType=edit&modelName=${getFeatureName()}`,
      });
      emitEvent(`willEditNameOf${capitalize(featureType)}`);
    } else {
      displayNotificationCTNotSaved();
    }
  };

  const handleClickOpenModalChooseAttributes = async () => {
    await wait();

    if (canOpenModal || isUpdatingTempFeature()) {
      push({ search: 'modalType=chooseAttributes' });
    } else {
      displayNotificationCTNotSaved();
    }
  };

  const isUpdatingTempFeature = () => {
    const isGroup = featureType === 'group';
    const data = isGroup ? groups : models;
    const currentData = data.find(d => d.name === getFeatureName());

    return get(currentData, 'isTemporary', false);
  };

  const wait = async () => {
    removePrompt();
    return new Promise(resolve => setTimeout(resolve, 100));
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
                description={get(getCurrentData(), 'schema.description', null)}
                icon={icon}
                title={getFeatureName()}
                actions={getPluginHeaderActions()}
                onClickIcon={handleClickIcon}
              />
              {getFeatureAttributesLength() === 0 ? (
                <EmptyAttributesBlock
                  description={`${pluginId}.home.emptyAttributes.description.${featureType}`}
                  id="openAddAttr"
                  label="content-type-builder.button.attributes.add"
                  onClick={handleClickOpenModalChooseAttributes}
                  title="content-type-builder.home.emptyAttributes.title"
                />
              ) : (
                { children }
              )}
            </div>
          </div>
        </div>
      </div>
      <AttributesModalPicker
        isOpen={getModalType() === 'chooseAttributes'}
        push={push}
      />
    </StyledViewContainer>
  );
}

ViewContainer.contextTypes = {
  emitEvent: PropTypes.func,
};

ViewContainer.defaultProps = {
  children: null,
  removePrompt: () => {},
};

ViewContainer.propTypes = {
  children: PropTypes.node,
  modifiedData: PropTypes.object.isRequired,
  removePrompt: PropTypes.func,
  tempData: PropTypes.object.isRequired,
};

export default ViewContainer;
