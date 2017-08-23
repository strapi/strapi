/*
 *
 * ModelPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators } from 'redux';
import { has, size, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router';

// Global selectors
import { makeSelectMenu } from 'containers/App/selectors';

import AttributeRow from 'components/AttributeRow';
import ContentHeader from 'components/ContentHeader';
import EmptyAttributesView from 'components/EmptyAttributesView';
import List from 'components/List';
import PluginLeftMenu from 'components/PluginLeftMenu';

import { modelFetch } from './actions';

import selectModelPage from './selectors';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.modelFetch(this.props.params.modelName);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.params.modelName !== this.props.params.modelName) {
      this.props.modelFetch(this.props.params.modelName);
    }
  }

  handleClick = () => {
    console.log('click');
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


  handleAddLinkClick = () => {
    console.log('click bla');
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

    return (
      <li className={linkStyles.pluginLeftMenuLink}>
        <Link className={linkStyles.link} to={`/plugins/content-type-builder/models/${props.link.name}`} activeClassName={linkStyles.linkActive}>
          <div>
            <i className={`fa ${props.link.icon}`} />
          </div>
          <span>{startCase(props.link.name)}</span>
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
    const content = size(this.props.modelPage.model.attributes) === 0 ?
      <EmptyAttributesView handleClick={this.handleClick} /> :
        <List
          listContent={this.props.modelPage.model}
          renderCustomListTitle={this.renderListTitle}
          listContentMappingKey={'attributes'}
          renderCustomLi={this.renderCustomLi}
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
                />
                {content}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  modelPage: selectModelPage(),
  menu: makeSelectMenu(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      modelFetch,
    },
    dispatch,
  );
}

ModelPage.propTypes = {
  menu: React.PropTypes.array,
  modelFetch: React.PropTypes.func,
  modelPage: React.PropTypes.object,
  params: React.PropTypes.object,
};

export default connect(mapStateToProps, mapDispatchToProps)(ModelPage);
