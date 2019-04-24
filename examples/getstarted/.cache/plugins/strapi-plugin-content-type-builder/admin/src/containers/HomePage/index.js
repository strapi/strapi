/**
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';

import {
  PluginHeader,
  getQueryParameters,
  routerPropTypes,
} from 'strapi-helper-plugin';

import EmptyContentTypeView from '../../components/EmptyContentTypeView';
import TableList from '../../components/TableList';

import pluginId from '../../pluginId';

import ModelForm from '../ModelForm';

import styles from './styles.scss';

class HomePage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  handleClick = () => {
    const {
      canOpenModal,
      history: { push },
    } = this.props;
    const { emitEvent } = this.context;

    if (canOpenModal) {
      emitEvent('willCreateContentType');
      push({
        search: 'modalType=model&settingType=base&actionType=create',
      });
    } else {
      strapi.notification.info(
        `${pluginId}.notification.info.contentType.creating.notSaved`,
      );
    }
  };

  render() {
    const {
      cancelNewContentType,
      canOpenModal,
      connections,
      createTempContentType,
      deleteModel,
      deleteTemporaryModel,
      history: { push },
      location: { pathname, search },
      models,
      modifiedData,
      newContentType,
      onChangeNewContentTypeMainInfos,
    } = this.props;
    const availableNumber = models.length;
    const title = `${pluginId}.table.contentType.title.${
      availableNumber > 1 ? 'plural' : 'singular'
    }`;
    const renderViewContent =
      availableNumber === 0 ? (
        <EmptyContentTypeView handleButtonClick={this.handleClick} /> // eslint-disable-line react/jsx-handler-names
      ) : (
        <TableList
          canOpenModalAddContentType={canOpenModal}
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
          }}
          actions={[]}
        />
        {renderViewContent}
        <ModelForm
          actionType="create"
          activeTab={getQueryParameters(search, 'settingType')}
          cancelNewContentType={cancelNewContentType}
          connections={connections}
          createTempContentType={createTempContentType}
          currentData={modifiedData}
          modifiedData={newContentType}
          onChangeNewContentTypeMainInfos={onChangeNewContentTypeMainInfos}
          isOpen={!isEmpty(search)}
          pathname={pathname}
          push={push}
        />
      </div>
    );
  }
}

HomePage.contextTypes = {
  emitEvent: PropTypes.func.isRequired,
};

HomePage.defaultProps = {
  canOpenModal: true,
  connections: ['default'],
  models: [],
  modifiedData: {},
};

HomePage.propTypes = {
  cancelNewContentType: PropTypes.func.isRequired,
  canOpenModal: PropTypes.bool,
  connections: PropTypes.array,
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
  onChangeNewContentTypeMainInfos: PropTypes.func.isRequired,
  ...routerPropTypes().history.isRequired,
};

export default HomePage;
