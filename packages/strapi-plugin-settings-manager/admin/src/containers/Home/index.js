/*
 *
 * Home
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createStructuredSelector } from 'reselect';

import {
  find,
  findIndex,
  findKey,
  forEach,
  get,
  has,
  isEmpty,
  includes,
  isObject,
  join,
  map,
  replace,
  split,
  toNumber,
  toLower,
  upperCase,
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
import RowDatabase from 'components/RowDatabase';

import { makeSelectSections, makeSelectEnvironments } from 'containers/App/selectors';
import selectHome from './selectors';
import {
  cancelChanges,
  changeDefaultLanguage,
  changeInput,
  configFetch,
  databaseEdit,
  databasesFetch,
  databaseDelete,
  editSettings,
  languageDelete,
  languagesFetch,
  newLanguagePost,
  newDatabasePost,
  specificDatabaseFetch,
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
      toggleDefaultConnection: false,
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
      this.handleFetch(nextProps);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.home.didCreatedNewLanguage !== this.props.home.didCreatedNewLanguage) {
      this.handleFetch(this.props);
    }

    if (prevProps.home.didCreatedNewDb !== this.props.home.didCreatedNewDb) {
      this.handleFetch(this.props);
    }
  }

  /* eslint-disable react/sort-comp */
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  addConnection = (e) => {
    e.preventDefault();
    const newData = {};
    /* eslint-disable no-template-curly-in-string */
    const dbName = get(this.props.home.modifiedData, 'database.connections.${name}.name');
    map(this.props.home.modifiedData, (data, key) => {
      const k = replace(key, '${name}', dbName);

      if (key !== 'database.connections.${name}.name') {
        newData[k] = data;
      }
    });

    this.props.newDatabasePost(this.props.params.env, newData);
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

    // format the default locale
    const defaultLanguageArray = this.formatLanguageLocale(target.id);

    // Edit the new config
    this.props.editSettings({ 'language.defaultLocale': join(defaultLanguageArray, '_') }, 'i18n');
  }

  formatLanguageLocale = (data) => {
    const array = [];

    forEach(split(data, '_'), (value, key) => {
      if (key === 0){
        array.push(toLower(value));
      } else {
        array.push(upperCase(value));
      }
    });

    return array;
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
    let value = target.type === 'number' ? toNumber(target.value) : target.value;
    let name = target.name;

    if (this.props.params.slug === 'security') {
      // the only case where the input doesn't have a name
      if (target.name === '') {
        name = 'security.xframe.value.nested';
        value = target.value;
      }
    }
    this.props.changeInput(name, value);
  }

  handleCancel = () => {
    this.props.cancelChanges();
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const apiUrl = this.props.params.env ? `${this.props.params.slug}/${this.props.params.env}` : this.props.params.slug;

    // send only updated settings
    const body = this.sendUpdatedParams();

    if (!isEmpty(body)) {
      this.props.editSettings(body, apiUrl);
    } else {
      window.Strapi.notification.error('Settings are equals');
    }
  }

  handleSubmitEditDatabase = (databaseName) => {
    const body = this.sendUpdatedParams();
    const apiUrl = `${databaseName}/${this.props.params.env}`;

    if (!isEmpty(body)) {
      this.props.databaseEdit(body, apiUrl);
    } else {
      window.Strapi.notification.error('Settings are equals');
    }
  }

  sendUpdatedParams = () => {
    const prevSettings = this.props.home.initialData;
    const body = {};

    forEach(this.props.home.modifiedData, (value, key) => {
      if (value !== prevSettings[key] && key !== 'security.xframe.value.nested') {
        body[key] = value;
      }
    });

    if (has(this.props.home.modifiedData, 'security.xframe.value.nested') && this.props.home.modifiedData['security.xframe.value'] === 'ALLOW-FROM') {
      const value = includes(this.props.home.modifiedData['security.xframe.value.nested'], 'ALLOW-FROM') ?
      `ALLOW-FROM ${this.props.home.modifiedData['security.xframe.value.nested']}`
       : `ALLOW-FROM.ALLOW-FROM ${this.props.home.modifiedData['security.xframe.value.nested']}`;

      body['security.xframe.value'] = value;
    }
    return body;
  }

  handleLanguageDelete = ({ target }) => {
    // retrieve the language to delete using the target id
    this.props.languageDelete(target.id);
  }

  handleDatabaseDelete = ({ target }) => {
    this.props.databaseDelete(target.id, this.props.params.env);
  }



  // custom Row rendering for the component List with params slug === languages
  renderRowLanguage = (props, key, liStyles) => {
    // assign the target id the language name to prepare for delete
    const deleteIcon = props.active ? '' : <i className="fa fa-trash"  onClick={this.handleLanguageDelete} id={props.name} />; // eslint-disable-line jsx-a11y/no-static-element-interactions

    // format the locale to
    const defaultLanguageArray = this.formatLanguageLocale(props.name);

    // retrieve language name from i18n translation
    const languageObject = find(get(this.props.home.listLanguages, ['sections', '0', 'items', '0', 'items']), ['value', join(defaultLanguageArray, '_')]);
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

    const flagName = this.formatLanguageLocale(props.name);
    let flag;
    switch (flagName.length) {
      case 2:
        flag = toLower(flagName[1]);
        break;
      case 3:
        flag = toLower(flagName[2]);
        break;
      default:
        flag = toLower(flagName[0]);
    }

    return (
      <li key={key}>
        <div className={liStyles.flexLi}>
          <div className={liStyles.flexed}>
            <div><span className={`flag-icon flag-icon-${flag}`} /></div>
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

  renderPopUpFormDatabase = (section, props, popUpStyles) => (
    map(section.items, (item, key) => {
      const isActive = props.values[this.props.home.dbNameTarget] === this.props.home.modifiedData['database.defaultConnection'] ?
        <div className={popUpStyles.rounded}><i className="fa fa-check" /></div> : '';

      if (item.name === 'form.database.item.default') {
        return (
          <div
            key={key}
            className={popUpStyles.defaultConnection}
            id={item.target}
            onClick={this.setDefaultConnectionDb}
          >
            {item.name}{isActive}
          </div>
        );
      }
      return (
        props.renderInput(item, key)
      );
    })
  )

  renderPopUpFormLanguage = (section, props) => (
    map(section.items, (item, key) => (
      <div key={key}>
        {props.renderInput(item, key, this.renderCustomLanguagesSelectOption)}
      </div>
    ))
  )


  renderRowDatabase = (props, key) => (
    // const isDefaultConnection = this.props.home.modifiedData['database.defaultConnection'] === props.host;
    <RowDatabase
      key={key}
      data={props}
      getDatabase={this.getDatabase}
      handleDatabaseDelete={this.handleDatabaseDelete}
      sections={this.props.home.specificDatabase.sections}
      values={this.props.home.modifiedData}
      handleChange={this.handleChange}
      renderPopUpForm={this.renderPopUpFormDatabase}
      handleSubmit={this.handleSubmitEditDatabase}
    />
  )

  renderComponent = () => {
    // check if  settingName (params.slug) has a custom view display
    const specificComponent = findKey(this.customComponents, (value) => includes(value, this.props.params.slug)) || 'defaultComponent';
    // if custom view display render specificComponent
    const Component = this.components[specificComponent];

    const listTitle = this.props.params.slug === 'languages' || 'databases' ? this.renderListTitle() : '';
    const listButtonLabel = this.props.params.slug === 'languages' || 'databases' ? this.renderListButtonLabel() : '';

    // check if HeaderNav component needs to render a form or a list
    const renderListComponent = this.props.params.slug === 'databases';

    let handleListPopUpSubmit;
    // sections is the props used by EditForm in case of list of table rendering we need to change its value
    let sections;
    let renderPopUpForm = false;
    let renderRow = false;

    switch (this.props.params.slug) {
      case 'languages':
        sections = this.props.home.listLanguages.sections;
        // custom rendering for PopUpForm
        renderPopUpForm = this.renderPopUpFormLanguage;
        renderRow = this.renderRowLanguage;
        handleListPopUpSubmit = this.props.newLanguagePost;
        break;
      case 'databases':
        sections = this.props.home.addDatabaseSection.sections;
        renderPopUpForm = this.renderPopUpFormDatabase;
        handleListPopUpSubmit = this.addConnection;
        renderRow = this.renderRowDatabase;
        break;
      default:
        sections = this.props.home.configsDisplay.sections;
    }

    // custom selectOptions for languages
    const selectOptions = this.props.params.slug === 'languages' ? this.props.home.listLanguages : [];

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
        handleListPopUpSubmit={handleListPopUpSubmit}
        selectOptions={selectOptions}
        renderPopUpForm={renderPopUpForm}
        renderListComponent={renderListComponent}
        cancelAction={this.props.home.cancelAction}
      />
    );
  }

  getDatabase = (databaseName) => {
    // allow state here just for modal purpose
    this.props.specificDatabaseFetch(databaseName, this.props.params.env);
    // this.setState({ modal: !this.state.modal });
  }

  setDefaultConnectionDb = (e) => {
    const value = this.state.toggleDefaultConnection ?
      this.props.home.addDatabaseSection.sections[1].items[0].value
        : this.props.home.modifiedData[this.props.home.dbNameTarget];
    // const target = { name: e.target.id, value: this.props.home.modifiedData[this.props.home.dbNameTarget] }
    const target = { name: e.target.id, value };
    this.handleChange({target});
    this.setState({ toggleDefaultConnection: !this.state.toggleDefaultConnection });
  }

  // Hide database modal
  toggle = () => {
    this.setState({ modal: !this.state.modal });
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
      databaseDelete,
      databaseEdit,
      databasesFetch,
      editSettings,
      languageDelete,
      languagesFetch,
      newDatabasePost,
      newLanguagePost,
      specificDatabaseFetch,
    },
    dispatch
  )
}

Home.propTypes = {
  cancelChanges: React.PropTypes.func,
  changeDefaultLanguage: React.PropTypes.func,
  changeInput: React.PropTypes.func,
  configFetch: React.PropTypes.func.isRequired,
  databaseDelete: React.PropTypes.func,
  databaseEdit: React.PropTypes.func,
  databasesFetch: React.PropTypes.func,
  editSettings: React.PropTypes.func,
  environments: React.PropTypes.array,
  home: React.PropTypes.object,
  languageDelete: React.PropTypes.func,
  languagesFetch: React.PropTypes.func,
  location: React.PropTypes.object,
  menuSections: React.PropTypes.array,
  newDatabasePost: React.PropTypes.func,
  newLanguagePost: React.PropTypes.func,
  params: React.PropTypes.object.isRequired,
  specificDatabaseFetch: React.PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
