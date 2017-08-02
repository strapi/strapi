/*
 *
 * Home
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createStructuredSelector } from 'reselect';
// modal
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import {
  find,
  findIndex,
  findKey,
  forEach,
  get,
  isEmpty,
  includes,
  isObject,
  map,
  toNumber,
} from 'lodash';
import { FormattedMessage } from 'react-intl';
import Helmet from 'react-helmet';
import { router } from 'app';

// design
import ContentHeader from 'components/ContentHeader';
import Debug from 'components/Debug';
import EditForm from 'components/EditForm';
import HeaderNav from 'components/HeaderNav';
import List from 'components/List';

import { makeSelectSections, makeSelectEnvironments } from 'containers/App/selectors';
import selectHome from './selectors';
import {
  cancelChanges,
  changeDefaultLanguage,
  changeInput,
  configFetch,
  databasesFetch,
  editSettings,
  languageDelete,
  languagesFetch,
  newLanguagePost,
} from './actions'
import styles from './styles.scss';
import config from './config.json';

export class Home extends React.Component { // eslint-disable-line react/prefer-stateless-function

  constructor(props) {
    super(props);
    this.customComponents = config.customComponents;
    this.components = {
      editForm: EditForm,
      list: List,
      defaultComponent: HeaderNav,
      debug: Debug,
    };

    // allowing state only for database modal purpose
    this.state = {
      modal: false,
    };
  }

  componentDidMount() {
    if (this.props.params.slug) {
      this.handleFetch(this.props);
    } else {
      router.push(`/plugins/settings-manager/${get(this.props.menuSections, ['0', 'items', '0', 'slug'])}`);
    }
  }


  componentWillReceiveProps(nextProps) {
    // check if params slug updated
    if (this.props.params.slug !== nextProps.params.slug && nextProps.params.slug) {
      if (nextProps.params.slug) {
        // get data from api if params slug updated
        this.handleFetch(nextProps);
      } else {
        // redirect user if no params slug provided
        router.push(`/plugins/settings-manager/${get(this.props.menuSections, ['0', 'items', '0', 'slug'])}`);
      }
    } else if (this.props.params.env !== nextProps.params.env && nextProps.params.env && this.props.params.env) {
      // get data if params env updated
      this.props.configFetch(`${this.props.params.slug}/${nextProps.params.env}`);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.home.didCreatedNewLanguage !== this.props.home.didCreatedNewLanguage) {
      this.handleFetch(this.props);
    }
  }

  handleFetch(props) {
    const apiUrl = props.params.env ? `${props.params.slug}/${props.params.env}` : props.params.slug;

    switch(props.params.slug) {
      case 'languages':
        return this.props.languagesFetch();
      case 'databases':
        return this.props.databasesFetch(props.params.env);
      default:
        return this.props.configFetch(apiUrl);
    }
  }

  handleChange = ({ target }) => {
    const value = target.type === 'number' ? toNumber(target.value) : target.value;
    this.props.changeInput(target.name, value);
  }

  handleCancel = () => {
    this.props.cancelChanges();
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const prevSettings = this.props.home.initialData;
    const body = {};
    const apiUrl = this.props.params.env ? `${this.props.params.slug}/${this.props.params.env}` : this.props.params.slug;

    // send only updated settings
    forEach(this.props.home.modifiedData, (value, key) => {
      if (value !== prevSettings[key]) {
        body[key] = value;
      }
    });

    if (!isEmpty(body)) {
      this.props.editSettings(body, apiUrl);
    } else {
      window.Strapi.notification.error('Settings are equals');
    }
  }

  handleLanguageDelete = ({ target }) => {
    // Display notification
    window.Strapi.notification.success('Deleting language...');
    // retrieve the language to delete using the target id
    this.props.languageDelete(target.id);
  }

  handleDatabaseDelete = () => {
    console.log('will detele');
  }

  addLanguage = () => {
    this.props.newLanguagePost();
  }

  showDatabaseModal = () => {
    // allow state here just for modal purpose
    this.setState({ modal: !this.state.modal });
  }

  changeDefaultLanguage = ({ target }) => {
    // create new object configsDisplay based on store property configsDisplay
    const configsDisplay = {
      name: this.props.home.configsDisplay.name,
      description: this.props.home.configsDisplay.description,
      sections: [],
    };

    // Find the index of the new setted language
    const activeLanguageIndex = findIndex(this.props.home.configsDisplay.sections, ['name', target.id]);

    forEach(this.props.home.configsDisplay.sections, (section, key) => {
      // set all Language active state to false
      if (key !== activeLanguageIndex) {
        configsDisplay.sections.push({ name: section.name, active: false });
      } else {
        // set the new language active state to true
        configsDisplay.sections.push({ name: section.name, active: true });
      }
    });

    // reset all the configs to ensure component is updated
    this.props.changeDefaultLanguage(configsDisplay, target.id);
    // Edit the new config
    this.props.editSettings({ 'i18n.i18n.defaultLocale': target.id }, 'i18n');
  }

  // Hide database modal
  toggle = () => {
    this.setState({ modal: !this.state.modal });
  }

  // custom Row rendering for the component List with params slug === languages
  renderRowLanguage = (props, key, liStyles) => {
    // assign the target id the language name to prepare for delete
    const deleteIcon = props.active ? '' : <i className="fa fa-trash"  onClick={this.handleLanguageDelete} id={props.name} />; // eslint-disable-line jsx-a11y/no-static-element-interactions
    // retrieve language name from i18n translation
    const languageObject = find(get(this.props.home.listLanguages, ['sections', '0', 'items', '0', 'items']), ['value', props.name]);
    // apply i18n
    const languageDisplay = isObject(languageObject) ? <FormattedMessage {...{ id: languageObject.name }} /> : '';

    const languageLabel = props.active ?
      <span className={liStyles.italicText}>
        <FormattedMessage {...{id: 'list.languages.default.languages'}} />
      </span> :
      // set the span's id with the language name to retrieve it
        <FormattedMessage {...{id: 'list.languages.set.languages'}}>
          {(message) => (
            <button className={liStyles.normal} onClick={this.changeDefaultLanguage} id={props.name}>
              {message}
            </button>
          )}
        </FormattedMessage>;

    return (
      <li key={key}>
        <div className={liStyles.flexLi}>
          <div className={liStyles.flexed}>
            <div>{key}</div>
            <div className={`${liStyles.label} ${liStyles.capitalized}`}>{languageDisplay}</div>
          </div>
          <div>{props.name}</div>
          <div className={liStyles.centered}>{languageLabel}</div>
          <div>{deleteIcon}</div>
        </div>
      </li>
    )
  }

  renderListTitle = () => {
    const availableContentNumber = this.props.home.configsDisplay.sections.length;
    const title = availableContentNumber > 1 ? `list.${this.props.params.slug}.title.plural` : `list.${this.props.params.slug}.title.singular`;
    const titleDisplay = title ? <FormattedMessage {...{id: title}} /> : '';
    return <span>{availableContentNumber}&nbsp;{titleDisplay}</span>
  }

  renderListButtonLabel = () => `list.${this.props.params.slug}.button.label`;

  renderPopUpFormLanguage = (section, props) => (
    map(section.items, (item, key) => (
      <div key={key}>
        <form>
          {props.renderInput(item, key)}
        </form>
      </div>
    ))
  )

  renderRowDatabase = (props, key, listStyles) => {
    let provider;

    // TODO provider
    switch(props.provider) {
      case 'strapi-mongoose':
        provider = 'M';
        break;
      default:
        provider = 'N/A';
    }
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <li key={key}>
        <div className={listStyles.flexLi}>
          <div className={listStyles.flexed}>
            <div className={`${listStyles.squared} ${listStyles.orange}`}>
              {provider}
            </div>
            <div className={listStyles.label}>{props.name}</div>
          </div>
          <div>{props.database}</div>
          <div className={listStyles.centered}>{props.host}</div>
          <div className={listStyles.flexed}>

            <div><i className="fa fa-pencil" onClick={this.showDatabaseModal} /></div>
            <div className={listStyles.leftSpaced}><i className="fa fa-trash" onClick={this.handleDatabaseDelete} /></div>
          </div>
        </div>
        <div>
          <Modal isOpen={this.state.modal} toggle={this.toggle} className={listStyles.modalPosition}>
            <ModalHeader toggle={this.toggle} className={`${listStyles.noBorder} ${listStyles.padded} ${listStyles.mHeader}`}>
              Databases
            </ModalHeader>
            <div className={listStyles.bordered} />
            <ModalBody className={listStyles.modalBody}>
            </ModalBody>
            <ModalFooter className={`${listStyles.noBorder} ${listStyles.flexStart} ${listStyles.modalFooter}`}>
              {/* TODO change tthis.toggle => this.props.addLanguage */}
              <Button onClick={this.handleSubmit} className={listStyles.primary}>Save</Button>{' '}
              <Button onClick={this.toggle} className={listStyles.secondary}>Cancel</Button>
            </ModalFooter>
          </Modal>
        </div>
      </li>
    );
  }

  renderComponent = () => {
    // check if  settingName (params.slug) has a custom view display
    const specificComponent = findKey(this.customComponents, (value) => includes(value, this.props.params.slug)) || 'defaultComponent';
    // if custom view display render specificComponent
    const Component = this.components[specificComponent];

    const listTitle = this.props.params.slug === 'languages' || 'databases' ? this.renderListTitle() : '';
    const listButtonLabel = this.props.params.slug === 'languages' || 'databases' ? this.renderListButtonLabel() : '';

    // sections is the props used by EditForm in case of list of table rendering we need to change its value
    const sections = this.props.params.slug === 'languages' ? this.props.home.listLanguages.sections : this.props.home.configsDisplay.sections;


    // custom selectOptions for languages
    const selectOptions = this.props.params.slug === 'languages' ? this.props.home.listLanguages : [];

    // custom rendering for PopUpForm
    const renderPopUpForm = this.props.params.slug === 'languages' ? this.renderPopUpFormLanguage : false;

    let renderRow = false;

    if (this.props.params.slug === 'languages') {
      renderRow = this.renderRowLanguage;
    } else if (this.props.params.slug === 'databases') {
      renderRow = this.renderRowDatabase;
    }

    return (
      <Component
        sections={sections}
        listItems={this.props.home.configsDisplay.sections}
        values={this.props.home.modifiedData}
        handleChange={this.handleChange}
        handleCancel={this.handleCancel}
        handleSubmit={this.handleSubmit}
        links={this.props.environments}
        path={this.props.location.pathname}
        slug={this.props.params.slug}
        renderRow={renderRow}
        listTitle={listTitle}
        listButtonLabel={listButtonLabel}
        handlei18n
        handleListPopUpSubmit={this.addLanguage}
        selectOptions={selectOptions}
        renderPopUpForm={renderPopUpForm}
      />
    );
  }

  render() {
    if (this.props.home.loading) {
      return <div />;
    }

    return (
      <div className={`${styles.home} col-md-9`}>
        <Helmet
          title="Settings Manager"
          meta={[
            { name: 'Settings Manager Plugin', content: 'Modify your app settings' },
          ]}
        />
        <ContentHeader
          name={this.props.home.configsDisplay.name}
          description={this.props.home.configsDisplay.description}
        />
        {this.renderComponent()}
      </div>
    );
  }
}


const mapStateToProps = createStructuredSelector({
  environments: makeSelectEnvironments(),
  home: selectHome(),
  menuSections: makeSelectSections(),
})

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      cancelChanges,
      changeDefaultLanguage,
      changeInput,
      configFetch,
      databasesFetch,
      editSettings,
      languageDelete,
      languagesFetch,
      newLanguagePost,
    },
    dispatch
  )
}

Home.propTypes = {
  cancelChanges: React.PropTypes.func,
  changeDefaultLanguage: React.PropTypes.func,
  changeInput: React.PropTypes.func,
  configFetch: React.PropTypes.func.isRequired,
  databasesFetch: React.PropTypes.func,
  editSettings: React.PropTypes.func,
  environments: React.PropTypes.array,
  home: React.PropTypes.object,
  languageDelete: React.PropTypes.func,
  languagesFetch: React.PropTypes.func,
  location: React.PropTypes.object,
  menuSections: React.PropTypes.array,
  newLanguagePost: React.PropTypes.func,
  params: React.PropTypes.object.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
