/*
 *
 * ModelPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators } from 'redux';
import { get, has, size, replace, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router';
import { router } from 'app';

// Global selectors
import { makeSelectMenu } from 'containers/App/selectors';
import { makeSelectDidFetchModel } from 'containers/Form/selectors';

import AttributeRow from 'components/AttributeRow';
import ContentHeader from 'components/ContentHeader';
import EmptyAttributesView from 'components/EmptyAttributesView';
import Form from 'containers/Form';
import List from 'components/List';
import PluginLeftMenu from 'components/PluginLeftMenu';

import { storeData } from '../../utils/storeData';

import { modelFetch, modelFetchSucceeded } from './actions';

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

  componentDidUpdate(prevProps) {
    if (prevProps.params.modelName !== this.props.params.modelName) {
      this.fetchModel();
    }

    // Refecth content type after editing it
    if (prevProps.location.hash !== this.props.location.hash && this.props.didFetchModel) {
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

  renderCustomLi = (row, key) => <AttributeRow key={key} row={row} />

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
                  noI18n
                  editIcon
                  editPath={`${redirectRoute}/${this.props.params.modelName}#edit${this.props.params.modelName}::contentType::baseSettings`}
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
        />
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  modelPage: selectModelPage(),
  menu: makeSelectMenu(),
  didFetchModel: makeSelectDidFetchModel(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      modelFetch,
      modelFetchSucceeded,
    },
    dispatch,
  );
}

ModelPage.propTypes = {
  didFetchModel: React.PropTypes.bool,
  location: React.PropTypes.object,
  menu: React.PropTypes.array,
  modelFetch: React.PropTypes.func,
  modelFetchSucceeded: React.PropTypes.func,
  modelPage: React.PropTypes.object,
  params: React.PropTypes.object,
  route: React.PropTypes.object,
};

export default connect(mapStateToProps, mapDispatchToProps)(ModelPage);
