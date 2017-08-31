/*
 *
 * ModelPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators } from 'redux';
import { get, has, size, replace, startCase, findIndex } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router';
import { router } from 'app';

// Global selectors
import { makeSelectContentTypeUpdated } from 'containers/Form/selectors';

import AttributeRow from 'components/AttributeRow';
import ContentHeader from 'components/ContentHeader';
import EmptyAttributesView from 'components/EmptyAttributesView';
import Form from 'containers/Form';
import List from 'components/List';
import PluginLeftMenu from 'components/PluginLeftMenu';

import { storeData } from '../../utils/storeData';

import {
  cancelChanges,
  deleteAttribute,
  modelFetch,
  modelFetchSucceeded,
  resetShowButtonsProps,
  submit,
} from './actions';

import selectModelPage from './selectors';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.popUpHeaderNavLinks = [
      { name: 'baseSettings', message: 'popUpForm.navContainer.base' },
      { name: 'advancedSettings', message: 'popUpForm.navContainer.advanced' },
    ];
  }

  componentDidMount() {
    this.fetchModel();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.updatedContentType !== nextProps.updatedContentType) {
      this.fetchModel();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.params.modelName !== this.props.params.modelName) {
      this.props.resetShowButtonsProps();
      this.fetchModel();
    }
  }

  addCustomSection = (sectionStyles) => (
    <div className={sectionStyles.pluginLeftMenuSection}>
      <p>
        <FormattedMessage id={'menu.section.documentation.name'} />
      </p>
      <ul>
        <li>
          <FormattedMessage id={'menu.section.documentation.guide'} />&nbsp;
          <FormattedMessage id={'menu.section.documentation.guideLink'}>
            {(message) => (
              <Link to="#" target="_blank">{message}</Link>
            )}
          </FormattedMessage>
        </li>
        <li>
          <FormattedMessage id={'menu.section.documentation.tutorial'} />&nbsp;
          <FormattedMessage id={'menu.section.documentation.tutorialLink'}>
            {(mess) => (
              <Link to="#" target="_blank">{mess}</Link>
            )}
          </FormattedMessage>
        </li>
      </ul>
    </div>
  )

  fetchModel = () => {
    if (storeData.getIsModelTemporary() && get(storeData.getContentType(), 'name') === this.props.params.modelName) {
      this.props.modelFetchSucceeded({ model: storeData.getContentType() });
    } else {
      this.props.modelFetch(this.props.params.modelName);
    }
  }

  handleAddLinkClick = () => {
    if (storeData.getIsModelTemporary()) {
      window.Strapi.notification.info('notification.info.contentType.creating.notSaved');
    } else {
      this.toggleModal();
    }
  }

  handleClickAddAttribute = () => {
    router.push(`plugins/content-type-builder/models/${this.props.params.modelName}#choose::attributes`);
  }

  handleDelete = (attributeName) => {
    const index = findIndex(this.props.modelPage.model.attributes, ['name', attributeName]);
    this.props.deleteAttribute(index, this.props.params.modelName);
  }

  handleEditAttribute = (attributeName) => {
    const index = findIndex(this.props.modelPage.model.attributes, ['name', attributeName]);
    const attribute = this.props.modelPage.model.attributes[index];
    router.push(`plugins/content-type-builder/models/${this.props.params.modelName}#edit${this.props.params.modelName}::attribute${attribute.params.type}::baseSettings::${index}`);

  }


  toggleModal = () => {
    const locationHash = this.props.location.hash ? '' : '#create::contentType::baseSettings';
    router.push(`plugins/content-type-builder/models/${this.props.params.modelName}${locationHash}`);
  }

  renderAddLink = (props, customLinkStyles) => (
    <li className={customLinkStyles.pluginLeftMenuLink}>
      <div className={customLinkStyles.liInnerContainer} onClick={this.handleAddLinkClick}>
        <div>
          <i className={`fa ${props.link.icon}`} />
        </div>
        <span><FormattedMessage id={props.link.name} /></span>
      </div>
    </li>
  )

  renderCustomLi = (row, key) => <AttributeRow key={key} row={row} handleEdit={this.handleEditAttribute} handleDelete={this.handleDelete} />

  renderCustomLink = (props, linkStyles) => {
    if (props.link.name === 'button.contentType.add') return this.renderAddLink(props, linkStyles);

    const temporary = props.link.isTemporary ? <FormattedMessage id={'contentType.temporaryDisplay'} /> : '';
    return (
      <li className={linkStyles.pluginLeftMenuLink}>
        <Link className={linkStyles.link} to={`/plugins/content-type-builder/models/${props.link.name}`} activeClassName={linkStyles.linkActive}>
          <div>
            <i className={`fa fa-caret-square-o-right`} />
          </div>
          <span>{startCase(props.link.name)}</span>
          <span style={{ marginLeft: '1rem', fontStyle: 'italic' }}>{temporary}</span>
        </Link>
      </li>
    );
  }

  renderListTitle = (props, listStyles) => {
    const availableNumber = size(props.listContent.attributes);
    const title = availableNumber > 1 ? 'modelPage.contentType.list.title.plural'
      : 'modelPage.contentType.list.title.singular';

    const relationShipNumber = props.listContent.attributes.filter(attr => has(attr.params, 'model')).length;

    const relationShipTitle = relationShipNumber > 1 ? 'modelPage.contentType.list.relationShipTitle.plural'
      : 'modelPage.contentType.list.relationShipTitle.singular';

    let fullTitle;

    if (relationShipNumber > 0) {
      fullTitle = (
        <div className={listStyles.titleContainer}>
          {availableNumber} <FormattedMessage id={title} /> <FormattedMessage id={'modelPage.contentType.list.title.including'} /> {relationShipNumber} <FormattedMessage id={relationShipTitle} />
        </div>
      );
    } else {
      fullTitle = (
        <div className={listStyles.titleContainer}>
          {availableNumber} <FormattedMessage id={title} />

        </div>
      );
    }
    return fullTitle;
  }

  render() {
    // Url to redirects the user if he modifies the temporary content type name
    const redirectRoute = replace(this.props.route.path, '/:modelName', '');
    // const addButtons = this.props.modelPage.showButtons;
    const addButtons  = get(storeData.getContentType(), 'name') === this.props.params.modelName && size(get(storeData.getContentType(), 'attributes')) > 0 || this.props.modelPage.showButtons;
    
    const content = size(this.props.modelPage.model.attributes) === 0 ?
      <EmptyAttributesView handleClick={this.handleClickAddAttribute} /> :
        <List
          listContent={this.props.modelPage.model}
          renderCustomListTitle={this.renderListTitle}
          listContentMappingKey={'attributes'}
          renderCustomLi={this.renderCustomLi}
          handleButtonClick={this.handleClickAddAttribute}
        />;
    return (
      <div className={styles.modelPage}>
        <div className="container-fluid">
          <div className="row">
            <PluginLeftMenu
              sections={this.props.menu}
              addCustomSection={this.addCustomSection}
              renderCustomLink={this.renderCustomLink}
            />
            <div className="col-md-9">
              <div className={styles.componentsContainer}>
                <ContentHeader
                  name={this.props.modelPage.model.name}
                  description={this.props.modelPage.model.description}
                  icoType="pencil"
                  editIcon
                  editPath={`${redirectRoute}/${this.props.params.modelName}#edit${this.props.params.modelName}::contentType::baseSettings`}
                  addButtons={addButtons}
                  handleSubmit={this.props.submit}
                  handleCancel={this.props.cancelChanges}
                />
                {content}
              </div>
            </div>
          </div>
        </div>
        <Form
          hash={this.props.location.hash}
          toggle={this.toggleModal}
          routePath={`${redirectRoute}/${this.props.params.modelName}`}
          popUpHeaderNavLinks={this.popUpHeaderNavLinks}
          menuData={this.props.menu}
          redirectRoute={redirectRoute}
          modelName={this.props.params.modelName}
          contentTypeData={this.props.modelPage.model}
          isModelPage
          modelLoading={this.props.modelPage.modelLoading}
        />
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  modelPage: selectModelPage(),
  updatedContentType: makeSelectContentTypeUpdated(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      cancelChanges,
      deleteAttribute,
      modelFetch,
      modelFetchSucceeded,
      resetShowButtonsProps,
      submit,
    },
    dispatch,
  );
}

ModelPage.propTypes = {
  cancelChanges: React.PropTypes.func,
  deleteAttribute: React.PropTypes.func,
  location: React.PropTypes.object,
  menu: React.PropTypes.array,
  modelFetch: React.PropTypes.func,
  modelFetchSucceeded: React.PropTypes.func,
  modelPage: React.PropTypes.object,
  params: React.PropTypes.object,
  resetShowButtonsProps: React.PropTypes.func,
  route: React.PropTypes.object,
  submit: React.PropTypes.func,
  updatedContentType: React.PropTypes.bool,
};

export default connect(mapStateToProps, mapDispatchToProps)(ModelPage);
