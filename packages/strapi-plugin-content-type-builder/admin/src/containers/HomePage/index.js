/**
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty } from 'lodash';

import PluginHeader from 'components/PluginHeader';

import getQueryParameters from 'utils/getQueryParameters';

import { routerPropTypes } from 'commonPropTypes';

import EmptyContentTypeView from '../../components/EmptyContentTypeView';
import TableList from '../../components/TableList';

import pluginId from '../../pluginId';

import ModelForm from '../ModelForm';

import styles from './styles.scss';

class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getActionType = () => {
    const { location: {  search } } = this.props;

    return getQueryParameters(search, 'actionType');
  }

  getFormData = () => {
    const { modifiedData, newContentType } = this.props;

    if (this.getActionType() === 'create') {
      return newContentType;
    }

    return get(modifiedData, this.getModelToEditName(), {});
  }

  getModelToEditName = () => {
    const { location: { search } } = this.props;

    return getQueryParameters(search, 'model');
  }

  handleClick = () => {
    const { canOpenModalAddContentType, history: { push } } = this.props;

    if (canOpenModalAddContentType) {
      push({
        search: 'modalType=model&settingType=base&actionType=create',
      });
    } else {
      strapi.notification.info(`${pluginId}.notification.info.contentType.creating.notSaved`);
    }
  }

  render() {
    const {
      cancelNewContentType,
      canOpenModalAddContentType,
      createTempContentType,
      deleteModel,
      deleteTemporaryModel,
      history: {
        push,
      },
      location: { pathname, search },
      models,
      modifiedData,
      onChangeNewContentType,
    } = this.props;
    const availableNumber = models.length;
    const title = availableNumber > 1 ? `${pluginId}.table.contentType.title.plural`
      : `${pluginId}.table.contentType.title.singular`;

    const renderViewContent = availableNumber === 0 ?
      <EmptyContentTypeView handleButtonClick={this.handleClick} /> // eslint-disable-line react/jsx-handler-names
    : (
      <TableList
        canOpenModalAddContentType={canOpenModalAddContentType}
        availableNumber={availableNumber}
        title={title}
        buttonLabel={`${pluginId}.button.contentType.add`}
        onButtonClick={this.handleClick}
        onDelete={deleteModel}
        deleteTemporaryModel={deleteTemporaryModel}
        rowItems={this.props.models}
        push={push}
      />
    );

    return (
      <div className={styles.homePage}>
        <PluginHeader
          title={{
            id: `${pluginId}.home.contentTypeBuilder.name`,
          }}
          description={{
            id: `${pluginId}.home.contentTypeBuilder.description`,
            values: {
              label: 'description', // TODO - replace w/ something better
            },
          }}
          actions={[]}
        />
        {renderViewContent}
        <ModelForm
          actionType={this.getActionType()}
          activeTab={getQueryParameters(search, 'settingType')}
          cancelNewContentType={cancelNewContentType}
          createTempContentType={createTempContentType}
          currentData={modifiedData}
          modelToEditName={this.getModelToEditName()}
          modifiedData={this.getFormData()}
          onChangeNewContentType={onChangeNewContentType}
          isOpen={!isEmpty(search)}
          pathname={pathname}
          push={push}
        />
      </div>
    );
  }
}

HomePage.defaultProps = {
  canOpenModalAddContentType: true,
  models: [],
  modifiedData: {},
};

HomePage.propTypes = {
  cancelNewContentType: PropTypes.func.isRequired,
  canOpenModalAddContentType: PropTypes.bool,
  createTempContentType: PropTypes.func.isRequired,
  deleteModel: PropTypes.func.isRequired,
  models: PropTypes.array,
  modifiedData: PropTypes.object,
  newContentType: PropTypes.shape({
    collectionName: PropTypes.string,
    connection: PropTypes.string,
    description: PropTypes.string,
    mainField: PropTypes.string,
    name: PropTypes.string,
    attributes: PropTypes.object,
  }).isRequired,
  onChangeNewContentType: PropTypes.func.isRequired,
  ...routerPropTypes().history.isRequired,
};

export default HomePage;
