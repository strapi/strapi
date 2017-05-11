/*
 *
 * Edit
 *
 */

import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import Container from '../../components/Container';
import EditForm from '../../components/EditForm';
import { makeSelectModels } from '../App/selectors';

import {
  setCurrentModelName,
  setIsCreating,
  loadRecord,
  setRecordAttribute,
  editRecord,
  deleteRecord,
} from './actions';
import {
  makeSelectRecord,
  makeSelectLoading,
  makeSelectCurrentModelName,
  makeSelectEditing,
  makeSelectDeleting,
  makeSelectIsCreating,
} from './selectors';

export class Edit extends React.Component {
  componentWillMount() {
    this.props.setCurrentModelName(this.props.routeParams.slug.toLowerCase());

    // Detect that the current route is the `create` route or not
    if (this.props.routeParams.id === 'create') {
      this.props.setIsCreating();
    } else {
      this.props.loadRecord(this.props.routeParams.id);
    }
  }

  render() {
    // Detect current model structure from models list
    const currentModel = this.props.models[this.props.currentModelName];

    const PluginHeader = this.props.exposedComponents.PluginHeader;

    let content = <p>Loading...</p>;
    if (currentModel && currentModel.attributes) {
      content = (
        <EditForm
          record={this.props.record}
          currentModel={currentModel}
          setRecordAttribute={this.props.setRecordAttribute}
          editRecord={this.props.editRecord}
          editing={this.props.editing}
        />
      );
    }

    // Define plugin header actions
    const pluginHeaderActions = [
      {
        label: 'Cancel',
        class: 'btn-default',
      },
      {
        label: this.props.editing ? 'Editing...' : 'Submit',
        class: 'btn-primary',
        onClick: this.props.editRecord,
        disabled: this.props.editing,
      },
    ];

    // Add the `Delete` button only in edit mode
    if (!this.props.isCreating) {
      pluginHeaderActions.push({
        label: 'Delete',
        class: 'btn-danger',
        onClick: this.props.deleteRecord,
        disabled: this.props.deleting,
      });
    }

    // Plugin header config
    const pluginHeaderTitle =
      _.upperFirst(this.props.routeParams.slug) || 'Content Manager';
    const pluginHeaderDescription = this.props.isCreating
      ? 'New entry'
      : `#${this.props.record.get('id')}`;

    return (
      <div className="col-md-12">
        <div className="container-fluid">
          <PluginHeader
            title={{
              id: 'plugin-content-manager-title',
              defaultMessage: `${pluginHeaderTitle}`,
            }}
            description={{
              id: 'plugin-content-manager-description',
              defaultMessage: `${pluginHeaderDescription}`,
            }}
            actions={pluginHeaderActions}
          />
          <Container>
            <p />
            <div className="row">
              <div className="col-md-8">
                {content}
              </div>
            </div>
          </Container>
        </div>
      </div>
    );
  }
}

Edit.propTypes = {
  currentModelName: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.string,
  ]),
  deleteRecord: React.PropTypes.func.isRequired,
  deleting: React.PropTypes.bool.isRequired,
  editing: React.PropTypes.bool.isRequired,
  editRecord: React.PropTypes.func.isRequired,
  exposedComponents: React.PropTypes.object.isRequired,
  isCreating: React.PropTypes.bool.isRequired,
  loadRecord: React.PropTypes.func.isRequired,
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  routeParams: React.PropTypes.object.isRequired,
  setCurrentModelName: React.PropTypes.func.isRequired,
  setIsCreating: React.PropTypes.func.isRequired,
  setRecordAttribute: React.PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  record: makeSelectRecord(),
  loading: makeSelectLoading(),
  currentModelName: makeSelectCurrentModelName(),
  models: makeSelectModels(),
  editing: makeSelectEditing(),
  deleting: makeSelectDeleting(),
  isCreating: makeSelectIsCreating(),
});

function mapDispatchToProps(dispatch) {
  return {
    setCurrentModelName: currentModelName =>
      dispatch(setCurrentModelName(currentModelName)),
    setIsCreating: () => dispatch(setIsCreating()),
    loadRecord: id => dispatch(loadRecord(id)),
    setRecordAttribute: (key, value) =>
      dispatch(setRecordAttribute(key, value)),
    editRecord: () => dispatch(editRecord()),
    deleteRecord: () => {
      // TODO: improve confirmation UX.
      if (window.confirm('Are you sure ?')) {
        dispatch(deleteRecord());
      }
    },
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Edit);
