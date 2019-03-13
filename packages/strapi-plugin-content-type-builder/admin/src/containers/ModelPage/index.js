/**
 *
 * ModelPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { FormattedMessage } from 'react-intl';
import { Redirect } from 'react-router-dom';
import { get, pickBy } from 'lodash';

import Button from 'components/Button';
import EmptyAttributesBlock from 'components/EmptyAttributesBlock';
import PluginHeader from 'components/PluginHeader';

import { routerPropTypes } from 'commonPropTypes';

import getQueryParameters from 'utils/getQueryParameters';

import pluginId from '../../pluginId';

import AttributeLi from '../../components/AttributeLi';
import Block from '../../components/Block';
import Flex from '../../components/Flex';
import LeftMenu from '../../components/LeftMenu';
import LeftMenuSection from '../../components/LeftMenuSection';
import LeftMenuSectionTitle from '../../components/LeftMenuSectionTitle';
import LeftMenuLink from '../../components/LeftMenuLink';
import ListTitle from '../../components/ListTitle';
import Ul from '../../components/Ul';

import AttributeForm from '../AttributeForm';
import AttributesModalPicker from '../AttributesPickerModal';
import ModelForm from '../ModelForm';

import {
  clearTemporaryAttribute,
  onCreateAttribute,
} from '../App/actions';

import CustomLink from './CustomLink';

import makeSelectModelPage from './selectors';
import reducer from './reducer';
import saga from './saga';
import styles from './styles.scss';
import DocumentationSection from './DocumentationSection';

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getFormData = () => {
    const { location: { search }, newContentType } = this.props;

    if (getQueryParameters(search, 'actionType') === 'create') {
      return newContentType;
    }

    return null;
  }

  getModel = () => {
    const { modifiedData } = this.props;

    return get(modifiedData, this.getModelName(), {});
  }

  getModelAttributes = () => get(this.getModel(), 'attributes', {});

  getModelAttributesLength = () => Object.keys(this.getModelAttributes()).length;

  getModelDescription = () => {
    const { initialData } = this.props;

    const description = get(
      initialData,
      [this.getModelName(), 'description'],
      null,
    );

    // eslint-disable-next-line no-extra-boolean-cast
    return !!description ? description : { id: `${pluginId}.modelPage.contentHeader.emptyDescription.description` };
  }

  getModelName = () => {
    const { match: { params: { modelName } } } = this.props;

    return modelName.split('&')[0];
  }

  getModelsNumber = () => {
    const { models } = this.props;

    return models.length;
  }

  getModelRelationShips = () => {
    const attributes = this.getModelAttributes();
    const relations = pickBy(attributes, attribute => {
      return !!get(attribute, 'target', null);
    });

    return relations;
  }

  getModelRelationShipsLength = () => Object.keys(this.getModelRelationShips()).length;

  getSectionTitle = () => {
    const base = `${pluginId}.menu.section.contentTypeBuilder.name.`;

    return this.getModelsNumber() > 1 ? `${base}plural` : `${base}singular`;
  }


  handleClickOpenModalChooseAttributes = () => {
    const { history: { push } } = this.props;

    push({ search: 'modalType=chooseAttributes' });
  }

  handleClickOpenModalCreateCT = () => {
    const { history: { push } } = this.props;

    if (this.shouldOpenModalAddCT()) {
      push({
        search: 'modalType=model&settingType=base&actionType=create',
      });
    } else {
      strapi.notification.info(`${pluginId}.notification.info.contentType.creating.notSaved`);
    }
  }

  isUpdatingTemporaryContentType = () => {
    const { models } = this.props;
    /* istanbul ignore next */
    const currentModel = models.find(model => model.name === this.getModelName()) || { isTemporary: true };

    const { isTemporary } = currentModel;

    return isTemporary;
  }

  shouldOpenModalAddCT = () => {
    const { models } = this.props;

    return models.every(model => (model.isTemporary === false));
  }

  shouldRedirect = () => {
    const { models } = this.props;

    return models.findIndex(model => model.name === this.getModelName()) === -1;
  }

  renderLinks = () => {
    const { models } = this.props;
    const links = models.map(model => {
      const { isTemporary, name, source } = model;
      const base = `/plugins/${pluginId}/models/${name}`;
      const to = source ? `${base}&source=${source}` : base;

      return (
        <LeftMenuLink
          key={name}
          icon="fa fa-caret-square-o-right"
          isTemporary={isTemporary}
          name={name}
          source={source}
          to={to}
        />
      );
    });

    return links;
  }

  renderLi = attribute => {
    const attributeInfos = get(this.getModelAttributes(), attribute, {});

    return <AttributeLi key={attribute} name={attribute} attributeInfos={attributeInfos} />;
  }

  render() {
    const listTitleMessageIdBasePrefix = `${pluginId}.modelPage.contentType.list.title`;
    const {
      cancelNewContentType,
      clearTemporaryAttribute,
      createTempContentType,
      history: { push },
      location: { pathname, search },
      models,
      modifiedData,
      onChangeNewContentType,
      onCreateAttribute,
      temporaryAttribute,
    } = this.props;

    if (this.shouldRedirect()) {
      const { name, source } = models[0];
      const to = source ? `${name}&source=${source}` : name;

      return <Redirect to={to} />;
    }

    const modalType = getQueryParameters(search, 'modalType');
    const settingType = getQueryParameters(search, 'settingType');
    const attributeType = getQueryParameters(search, 'attributeType');
    const actionType = getQueryParameters(search, 'actionType');

    return (
      <div className={styles.modelpage}>
        <div className="container-fluid">
          <div className="row">
            <LeftMenu>
              <LeftMenuSection>
                <LeftMenuSectionTitle id={this.getSectionTitle()} />
                <ul>
                  {this.renderLinks()}
                  <CustomLink onClick={this.handleClickOpenModalCreateCT} />
                </ul>
              </LeftMenuSection>
              <LeftMenuSection>
                <LeftMenuSectionTitle id={`${pluginId}.menu.section.documentation.name`} />
                <DocumentationSection />
              </LeftMenuSection>
            </LeftMenu>

            <div className="col-md-9">
              <div className={styles.componentsContainer}>
                <PluginHeader
                  description={this.getModelDescription()}
                  icon="fa fa-pencil"
                  title={this.getModelName()}
                />
                {this.getModelAttributesLength() === 0 ? (
                  <EmptyAttributesBlock
                    description="content-type-builder.home.emptyAttributes.description"
                    id="openAddAttr"
                    label="content-type-builder.button.attributes.add"
                    onClick={this.handleClickOpenModalChooseAttributes}
                    title="content-type-builder.home.emptyAttributes.title"
                  />
                ) : (
                  <Block>
                    <Flex>
                      <ListTitle>
                        {this.getModelAttributesLength()}
                        &nbsp;
                        <FormattedMessage
                          id={`${listTitleMessageIdBasePrefix}.${this.getModelAttributesLength() > 1 ? 'plural' : 'singular'}`}
                        />
                        {this.getModelRelationShipsLength() > 0 && (
                          <React.Fragment>
                            &nbsp;
                            <FormattedMessage
                              id={`${listTitleMessageIdBasePrefix}.including`}
                            />
                            &nbsp;
                            {this.getModelRelationShipsLength()}
                            &nbsp;
                            <FormattedMessage
                              id={`${pluginId}.modelPage.contentType.list.relationShipTitle.${this.getModelRelationShipsLength() > 1 ? 'plural' : 'singular'}`}
                            />
                          </React.Fragment>
                        )}
                      </ListTitle>
                      <div>
                        <Button
                          label={`${pluginId}.button.attributes.add`}
                          onClick={this.handleClickOpenModalChooseAttributes}
                          secondaryHotlineAdd
                        />
                      </div>
                    </Flex>
                    <div>
                      <Ul id="attributesList">
                        {Object.keys(this.getModelAttributes()).map(this.renderLi)}
                      </Ul>
                    </div>
                  </Block>
                )}
              </div>
            </div>
          </div>
        </div>
        <AttributesModalPicker
          isOpen={modalType === 'chooseAttributes'}
          push={push}
        />
        <AttributeForm
          activeTab={settingType}
          attributeType={attributeType}
          isContentTypeTemporary={this.isUpdatingTemporaryContentType()}
          isOpen={modalType === 'attributeForm' && attributeType !== 'relation'}
          modifiedData={temporaryAttribute}
          onCancel={clearTemporaryAttribute}
          onChange={onCreateAttribute}
          push={push}
        />
        <ModelForm
          actionType={actionType}
          activeTab={settingType}
          cancelNewContentType={cancelNewContentType}
          createTempContentType={createTempContentType}
          currentData={modifiedData}
          modifiedData={this.getFormData()}
          onChangeNewContentType={onChangeNewContentType}
          isOpen={modalType === 'model'}
          pathname={pathname}
          push={push}
        />
      </div>
    );
  }
}

ModelPage.propTypes = {
  ...routerPropTypes(
    { params: PropTypes.string },
  ).isRequired,
  clearTemporaryAttribute: PropTypes.func.isRequired,
  initialData: PropTypes.object.isRequired,
  models: PropTypes.array.isRequired,
  onCreateAttribute: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  modelpage: makeSelectModelPage(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      clearTemporaryAttribute,
      onCreateAttribute,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = strapi.injectReducer({ key: 'modelPage', reducer, pluginId });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = strapi.injectSaga({ key: 'modelPage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ModelPage);
