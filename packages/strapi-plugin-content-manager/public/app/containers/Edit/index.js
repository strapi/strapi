/*
 *
 * Edit
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import Container from 'components/Container';
import EditForm from 'components/EditForm';

import {
  setCurrentModelName,
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
} from './selectors';

import {
  makeSelectModels,
} from 'containers/App/selectors';

export class Edit extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentWillMount() {
    this.props.setCurrentModelName(this.props.routeParams.slug.toLowerCase());
    this.props.loadRecord(this.props.routeParams.id);
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

    const headersActions = [{
      label: 'Cancel',
      class: 'btn-default',
    }, {
      label: this.props.editing ? 'Editing...' : 'Submit',
      class: 'btn-primary',
      onClick: this.props.editRecord,
      disabled: this.props.editing,
    }, {
      label: 'Delete',
      class: 'btn-danger',
      onClick: this.props.deleteRecord,
      disabled: this.props.deleting,
    }];

    return (
      <div className="col-md-12">
        <div className="container-fluid">
          <PluginHeader
            title={{
              id: 'plugin-content-manager-title',
              defaultMessage: `Content Manager > ${this.props.routeParams.slug}`
            }}
            description={{
              id: 'plugin-content-manager-description',
              defaultMessage: `Manage your ${this.props.routeParams.slug}`
            }}
            actions={headersActions}
          />
          <Container>
            <p></p>
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
  setCurrentModelName: React.PropTypes.func,
  loadRecord: React.PropTypes.func,
  loading: React.PropTypes.bool,
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  editRecord: React.PropTypes.func,
  editing: React.PropTypes.bool,
  deleting: React.PropTypes.bool,
};

const mapStateToProps = createStructuredSelector({
  record: makeSelectRecord(),
  loading: makeSelectLoading(),
  currentModelName: makeSelectCurrentModelName(),
  models: makeSelectModels(),
  editing: makeSelectEditing(),
  deleting: makeSelectDeleting(),
});

function mapDispatchToProps(dispatch) {
  return {
    setCurrentModelName: (currentModelName) => dispatch(setCurrentModelName(currentModelName)),
    loadRecord: (id) => dispatch(loadRecord(id)),
    setRecordAttribute: (key, value) => dispatch(setRecordAttribute(key, value)),
    editRecord: () => dispatch(editRecord()),
    deleteRecord: () => {
      // TODO: improve confirmation UX.
      if (confirm('Are you sure ?')) {
        dispatch(deleteRecord());
      }
    },
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Edit);
