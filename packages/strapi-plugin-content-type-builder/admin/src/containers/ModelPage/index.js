/*
 *
 * ModelPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { get, has, includes, isEmpty, size, replace, startCase, findIndex } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { router } from 'app';
// Global selectors
import { makeSelectMenu } from 'containers/App/selectors';
import { makeSelectContentTypeUpdated } from 'containers/Form/selectors';
import AttributeRow from 'components/AttributeRow';
import ContentHeader from 'components/ContentHeader';
import EmptyAttributesBlock from 'components/EmptyAttributesBlock';
import Form from 'containers/Form';
import List from 'components/List';
import PluginLeftMenu from 'components/PluginLeftMenu';
import forms from 'containers/Form/forms.json';
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import { storeData } from '../../utils/storeData';
import {
  cancelChanges,
  deleteAttribute,
  modelFetch,
  modelFetchSucceeded,
  resetShowButtonsProps,
  submit,
} from './actions';
import saga from './sagas';
import reducer from './reducer';
import selectModelPage from './selectors';
import styles from './styles.scss';

// Array of attributes that the ctb can handle at the moment
const availableAttributes = Object.keys(forms.attribute);
availableAttributes.push('integer', 'decimal', 'float');

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable react/jsx-curly-brace-presence */

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      contentTypeTemporary: false,
    };

    this.popUpHeaderNavLinks = [
      { name: 'baseSettings', message: 'content-type-builder.popUpForm.navContainer.base', nameToReplace: 'advancedSettings' },
      { name: 'advancedSettings', message: 'content-type-builder.popUpForm.navContainer.advanced', nameToReplace: 'baseSettings' },
    ];

    this.contentHeaderButtons = [
      { label: 'content-type-builder.form.button.cancel', handleClick: this.props.cancelChanges, kind: 'secondary', type: 'button' },
      { label: 'content-type-builder.form.button.save', handleClick: this.handleSubmit, kind: 'primary', type: 'submit', id: 'saveData' },
    ];
  }

  componentDidMount() {
    this.fetchModel(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.updatedContentType !== nextProps.updatedContentType) {
      if (this.state.contentTypeTemporary && storeData.getContentType()) {
        this.props.modelFetchSucceeded({ model: storeData.getContentType() });
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.modelName !== this.props.match.params.modelName) {
      this.props.resetShowButtonsProps();
      this.fetchModel(this.props);
    }
  }

  componentWillUnmount() {
    this.props.resetShowButtonsProps();
  }

  addCustomSection = (sectionStyles) => (
    <div className={sectionStyles.pluginLeftMenuSection}>
      <p>
        <FormattedMessage id="content-type-builder.menu.section.documentation.name" />
      </p>
      <ul>
        <li>
          <FormattedMessage id="content-type-builder.menu.section.documentation.guide" />&nbsp;
          <FormattedMessage id="content-type-builder.menu.section.documentation.guideLink">
            {(message) => (
              <a href="http://strapi.io/documentation/3.x.x/guides/models.html" target="_blank">{message}</a>
            )}
          </FormattedMessage>
        </li>
        {/*<li>
          <FormattedMessage id="content-type-builder.menu.section.documentation.tutorial" />&nbsp;
          <FormattedMessage id="content-type-builder.menu.section.documentation.tutorialLink">
            {(mess) => (
              <Link to="#" target="_blank">{mess}</Link>
            )}
          </FormattedMessage>
        </li>*/}
      </ul>
    </div>
  )

  fetchModel = (props) => {
    if (storeData.getIsModelTemporary() && get(storeData.getContentType(), 'name') === props.match.params.modelName) {
      this.setState({ contentTypeTemporary: true });
      this.props.modelFetchSucceeded({ model: storeData.getContentType() });
    } else {
      this.setState({ contentTypeTemporary: false });
      this.props.modelFetch(props.match.params.modelName);
    }
  }

  handleAddLinkClick = () => {
    if (storeData.getIsModelTemporary()) {
      strapi.notification.info('content-type-builder.notification.info.contentType.creating.notSaved');
    } else {
      this.toggleModal();
    }
  }

  handleClickAddAttribute = () => {
    // Open the modal
    router.push(`/plugins/content-type-builder/models/${this.props.match.params.modelName}#choose::attributes`);
  }

  handleDelete = (attributeName) => {
    const { modelPage: { model } } = this.props;
    const index = findIndex(model.attributes, ['name', attributeName]);
    const attributeToRemove = get(model, ['attributes', index]);
    const parallelAttributeIndex = attributeToRemove.name === attributeToRemove.params.key ?
      -1 : findIndex(model.attributes, (attr) => attr.params.key === attributeName);
      
    this.props.deleteAttribute(index, this.props.match.params.modelName, parallelAttributeIndex !== -1);
  }

  handleEditAttribute = (attributeName) => {
    const index = findIndex(this.props.modelPage.model.attributes, ['name', attributeName]);
    const attribute = this.props.modelPage.model.attributes[index];

    // Display a notification if the attribute is not present in the ones that the ctb handles
    if (!has(attribute.params, 'nature') && !includes(availableAttributes, attribute.params.type)) {
      return strapi.notification.info('content-type-builder.notification.info.disable');
    }
    const settingsType = attribute.params.type ? 'baseSettings' : 'defineRelation';
    const parallelAttributeIndex = findIndex(this.props.modelPage.model.attributes, ['name', attribute.params.key]);
    const hasParallelAttribute = settingsType === 'defineRelation' && parallelAttributeIndex !== -1 ? `::${parallelAttributeIndex}` : '';

    let attributeType;

    switch (attribute.params.type) {
      case 'integer':
      case 'float':
      case 'decimal':
        attributeType = 'number';
        break;
      default:
        attributeType = attribute.params.type ? attribute.params.type : 'relation';
    }

    router.push(`/plugins/content-type-builder/models/${this.props.match.params.modelName}#edit${this.props.match.params.modelName}::attribute${attributeType}::${settingsType}::${index}${hasParallelAttribute}`);
  }

  handleSubmit = () => {
    this.props.submit(this.context, this.props.match.params.modelName);
  }

  toggleModal = () => {
    const locationHash = this.props.location.hash ? '' : '#create::contentType::baseSettings';
    router.push(`/plugins/content-type-builder/models/${this.props.match.params.modelName}${locationHash}`);
  }

  renderAddLink = (props, customLinkStyles) => (
    <li className={customLinkStyles.pluginLeftMenuLink}>
      <div className={`${customLinkStyles.liInnerContainer} ${styles.iconPlus}`} onClick={this.handleAddLinkClick}>
        <div>
          <i className={`fa ${props.link.icon}`} />
        </div>
        <span><FormattedMessage id={`content-type-builder.${props.link.name}`} /></span>
      </div>
    </li>
  )

  renderCustomLi = (row, key) => <AttributeRow key={key} row={row} onEditAttribute={this.handleEditAttribute} onDelete={this.handleDelete} />

  renderCustomLink = (props, linkStyles) => {
    if (props.link.name === 'button.contentType.add') {
      return this.renderAddLink(props, linkStyles);
    }

    const linkName = props.link.source ?  `${props.link.name}&source=${props.link.source}` : props.link.name;
    const temporary = props.link.isTemporary || this.props.modelPage.showButtons && linkName === this.props.match.params.modelName ? <FormattedMessage id="content-type-builder.contentType.temporaryDisplay" /> : '';
    const spanStyle = props.link.isTemporary || this.props.modelPage.showButtons && linkName === this.props.match.params.modelName || isEmpty(temporary) && props.link.source ? styles.leftMenuSpan : '';
    const pluginSource = isEmpty(temporary) && props.link.source ? <FormattedMessage id="content-type-builder.from">{(message) => <span style={{ marginRight: '10px' }}>({message}: {props.link.source})</span>}</FormattedMessage>: '';

    return (
      <li className={linkStyles.pluginLeftMenuLink}>
        <NavLink className={linkStyles.link} to={`/plugins/content-type-builder/models/${props.link.name}${props.link.source ? `&source=${props.link.source}` : ''}`} activeClassName={linkStyles.linkActive}>
          <div>
            <i className={`fa fa-caret-square-o-right`} />
          </div>
          <div className={styles.contentContainer}>

            <span className={spanStyle}>{startCase(props.link.name)}</span>
            <span style={{ marginLeft: '1rem', fontStyle: 'italic' }}>{temporary}{pluginSource}</span>
          </div>
        </NavLink>
      </li>
    );
  }

  renderListTitle = (props, listStyles) => {
    const availableNumber = size(props.listContent.attributes);
    const title = availableNumber > 1 ? 'content-type-builder.modelPage.contentType.list.title.plural'
      : 'content-type-builder.modelPage.contentType.list.title.singular';

    const relationShipNumber = props.listContent.attributes.filter(attr => has(attr.params, 'target')).length;

    const relationShipTitle = relationShipNumber > 1 ? 'content-type-builder.modelPage.contentType.list.relationShipTitle.plural'
      : 'content-type-builder.modelPage.contentType.list.relationShipTitle.singular';

    let fullTitle;

    if (relationShipNumber > 0) {
      fullTitle = (
        <div className={listStyles.titleContainer}>
          {availableNumber} <FormattedMessage id={title} /> <FormattedMessage id={'content-type-builder.modelPage.contentType.list.title.including'} /> {relationShipNumber} <FormattedMessage id={relationShipTitle} />
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
    const redirectRoute = replace(this.props.match.path, '/:modelName', '');
    const addButtons  = get(storeData.getContentType(), 'name') === this.props.match.params.modelName && size(get(storeData.getContentType(), 'attributes')) > 0 || this.props.modelPage.showButtons;
    const contentHeaderDescription = this.props.modelPage.model.description || 'content-type-builder.modelPage.contentHeader.emptyDescription.description';
    const content = size(this.props.modelPage.model.attributes) === 0 ?
      <EmptyAttributesBlock title="content-type-builder.home.emptyAttributes.title" description="content-type-builder.home.emptyAttributes.description" label="content-type-builder.button.attributes.add" onClick={this.handleClickAddAttribute} id="openAddAttr" /> :
      <List
        id="attributesList"
        listContent={this.props.modelPage.model}
        renderCustomListTitle={this.renderListTitle}
        listContentMappingKey={'attributes'}
        renderCustomLi={this.renderCustomLi}
        onButtonClick={this.handleClickAddAttribute}
      />;
    const icoType = includes(this.props.match.params.modelName, '&source=') ? '' : 'pencil';

    return (
      <div className={styles.modelPage}>
        <div className="container-fluid">
          <div className="row">
            <PluginLeftMenu
              sections={this.props.menu}
              renderCustomLink={this.renderCustomLink}
              addCustomSection={this.addCustomSection}
            />

            <div className="col-md-9">
              <div className={styles.componentsContainer}>
                <ContentHeader
                  name={this.props.modelPage.model.name}
                  description={contentHeaderDescription}
                  icoType={icoType}
                  editIcon
                  editPath={`${redirectRoute}/${this.props.match.params.modelName}#edit${this.props.match.params.modelName}::contentType::baseSettings`}
                  addButtons={addButtons}
                  handleSubmit={this.props.submit}
                  isLoading={this.props.modelPage.showButtonLoader}
                  buttonsContent={this.contentHeaderButtons}

                />
                {content}
              </div>
            </div>
          </div>
        </div>
        <Form
          hash={this.props.location.hash}
          toggle={this.toggleModal}
          routePath={`${redirectRoute}/${this.props.match.params.modelName}`}
          popUpHeaderNavLinks={this.popUpHeaderNavLinks}
          menuData={this.props.menu}
          redirectRoute={redirectRoute}
          modelName={this.props.match.params.modelName}
          contentTypeData={this.props.modelPage.model}
          isModelPage
          modelLoading={this.props.modelPage.modelLoading}
        />
      </div>
    );
  }
}

ModelPage.contextTypes = {
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

ModelPage.propTypes = {
  cancelChanges: PropTypes.func.isRequired,
  deleteAttribute: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  menu: PropTypes.array.isRequired,
  modelFetch: PropTypes.func.isRequired,
  modelFetchSucceeded: PropTypes.func.isRequired,
  modelPage: PropTypes.object.isRequired,
  resetShowButtonsProps: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  updatedContentType: PropTypes.bool.isRequired,
};

const mapStateToProps = createStructuredSelector({
  menu: makeSelectMenu(),
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

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withSaga = injectSaga({ key: 'modelPage', saga });
const withReducer = injectReducer({ key: 'modelPage', reducer });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ModelPage);
