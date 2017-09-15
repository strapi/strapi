/*
 *
 * Edit
 *
 */

// Dependencies.
import React from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import { get, isObject } from 'lodash';
import { router } from 'app';

// Components.
import EditForm from 'components/EditForm';
import EditFormRelations from 'components/EditFormRelations';
import PluginHeader from 'components/PluginHeader';

// Selectors.
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

// Utils.
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
import templateObject from 'utils/templateObject';

// Styles.
import styles from './styles.scss';

// Actions.
import {
  setInitialState,
  setCurrentModelName,
  setIsCreating,
  loadRecord,
  setRecordAttribute,
  editRecord,
  toggleNull,
} from './actions';

// Selectors.

import {
  makeSelectRecord,
  makeSelectLoading,
  makeSelectCurrentModelName,
  makeSelectEditing,
  makeSelectDeleting,
  makeSelectIsCreating,
  makeSelectIsRelationComponentNull,
} from './selectors';

import reducer from './reducer';
import saga from './sagas';

export class Edit extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.setInitialState();
    this.props.setCurrentModelName(this.props.match.params.slug.toLowerCase());

    // Detect that the current route is the `create` route or not
    if (this.props.match.params.id === 'create') {
      this.props.setIsCreating();
    } else {
      this.props.loadRecord(this.props.match.params.id);
    }
  }

  handleChange = (e) => {
    if (isObject(e.target.value) && e.target.value._isAMomentObject === true) {
      e.target.value = moment(e.target.value, 'YYYY-MM-DD HH:mm:ss').format();
    }

    this.props.setRecordAttribute(e.target.name, e.target.value);
  };

  handleSubmit = () => {
    this.props.editRecord();
  };

  render() {
    if (this.props.loading || !this.props.schema || !this.props.currentModelName) {
      return <p>Loading...</p>;
    }

    const content = (
      <EditForm
        record={this.props.record}
        currentModelName={this.props.currentModelName}
        schema={this.props.schema}
        setRecordAttribute={this.props.setRecordAttribute}
        handleChange={this.handleChange}
        handleSubmit={this.handleSubmit}
        editing={this.props.editing}
      />
    );

    const relations = (
      <EditFormRelations
        currentModelName={this.props.currentModelName}
        record={this.props.record}
        schema={this.props.schema}
        setRecordAttribute={this.props.setRecordAttribute}
        isNull={this.props.isRelationComponentNull}
        toggleNull={this.props.toggleNull}
      />
    );

    // Define plugin header actions
    const pluginHeaderActions = [
      {
        label: 'content-manager.containers.Edit.cancel',
        handlei18n: true,
        buttonBackground: 'secondary',
        buttonSize: 'buttonMd',
        onClick: () => router.push(`/plugins/content-manager/${this.props.currentModelName}`),
      },
      {
        handlei18n: true,
        buttonBackground: 'primary',
        buttonSize: 'buttonLg',
        label: this.props.editing ? 'content-manager.containers.Edit.editing' : 'content-manager.containers.Edit.submit',
        onClick: this.props.editRecord,
        disabled: this.props.editing,
      },
    ];

    const pluginHeaderSubActions = [
      {
        label: 'content-manager.containers.Edit.returnList',
        handlei18n: true,
        buttonBackground: 'back',
        onClick: () => router.goBack(),
      },
    ]

    // Add the `Delete` button only in edit mode
    // if (!this.props.isCreating) {
    //   pluginHeaderActions.push({
    //     label: 'content-manager.containers.Edit.delete',
    //     class: 'btn-danger',
    //     onClick: this.props.deleteRecord,
    //     disabled: this.props.deleting,
    //   });
    // }

    // Plugin header config
    const primaryKey = this.props.models[this.props.currentModelName].primaryKey;
    const mainField = get(this.props.models, `${this.props.currentModelName}.info.mainField`) || primaryKey;
    const pluginHeaderTitle = this.props.isCreating ? 'New entry' : templateObject({ mainField }, this.props.record.toJS()).mainField;
    const pluginHeaderDescription = this.props.isCreating ? 'New entry' : `#${this.props.record && this.props.record.get(primaryKey)}`;

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <PluginHeader
            title={{
              id: pluginHeaderTitle,
            }}
            description={{
              id: 'plugin-content-manager-description',
              defaultMessage: `${pluginHeaderDescription}`,
            }}
            actions={pluginHeaderActions}
            subActions={pluginHeaderSubActions}
            fullWidth={this.props.isRelationComponentNull}
          />
          <div className='row'>
            <div className={this.props.isRelationComponentNull ? `col-lg-12` : `col-lg-8`}>
              <div className={styles.main_wrapper}>
                {content}
              </div>
            </div>
            <div className={`col-lg-4 ${this.props.isRelationComponentNull ? 'hidden-xl-down' : ''}`}>
              <div className={styles.sub_wrapper}>
                {relations}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Edit.propTypes = {
  currentModelName: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.string,
  ]).isRequired,
  // deleteRecord: React.PropTypes.func.isRequired,
  // deleting: React.PropTypes.bool.isRequired,
  editing: React.PropTypes.bool.isRequired,
  editRecord: React.PropTypes.func.isRequired,
  isCreating: React.PropTypes.bool.isRequired,
  isRelationComponentNull: React.PropTypes.bool.isRequired,
  loading: React.PropTypes.bool.isRequired,
  loadRecord: React.PropTypes.func.isRequired,
  match: React.PropTypes.shape({
    params: React.PropTypes.shape({
      id: React.PropTypes.string,
      slug: React.PropTypes.string,
    }),
  }).isRequired,
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  schema: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  setCurrentModelName: React.PropTypes.func.isRequired,
  setInitialState: React.PropTypes.func.isRequired,
  setIsCreating: React.PropTypes.func.isRequired,
  setRecordAttribute: React.PropTypes.func.isRequired,
  toggleNull: React.PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  record: makeSelectRecord(),
  loading: makeSelectLoading(),
  currentModelName: makeSelectCurrentModelName(),
  editing: makeSelectEditing(),
  deleting: makeSelectDeleting(),
  isCreating: makeSelectIsCreating(),
  schema: makeSelectSchema(),
  models: makeSelectModels(),
  isRelationComponentNull: makeSelectIsRelationComponentNull(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      setInitialState,
      setCurrentModelName,
      setIsCreating,
      loadRecord,
      setRecordAttribute,
      editRecord,
      toggleNull,
    },
    dispatch
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'edit', reducer });
const withSaga = injectSaga({ key: 'edit', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Edit);
