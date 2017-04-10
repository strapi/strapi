/*
 *
 * List
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import Container from 'components/Container';
import Table from 'components/Table';
import _ from 'lodash';

import styles from './styles.scss';

import {
  setCurrentModelName,
  loadRecords,
} from './actions';

import {
  makeSelectLoading,
  makeSelectModelRecords,
  makeSelectCurrentModelName,
} from './selectors';

import {
  makeSelectModels,
} from 'containers/App/selectors';

export class List extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentWillMount() {
    this.props.setCurrentModelName(this.props.routeParams.slug.toLowerCase());
    this.props.loadRecords();
  }

  render() {
    const PluginHeader = this.props.exposedComponents.PluginHeader;

    let content;
    if (this.props.loading) {
      content = (
        <div>
          <p>Loading...</p>
        </div>
      );
    } else {
      // Detect current model structure from models list
      const currentModel = this.props.models[this.props.currentModelName];

      // Hide non displayed attributes
      const displayedAttributes = _.pickBy(currentModel.attributes, (attr) => (!attr.admin || attr.admin.displayed !== false));

      // Define table headers
      const tableHeaders = _.map(displayedAttributes, (value, key) => ({
          name: key,
          label: key,
          type: value.type,
        })
      );

      content = (
        <Table
          records={this.props.records}
          route={this.props.route}
          routeParams={this.props.routeParams}
          headers={tableHeaders}
        />
      )
    }

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <PluginHeader title={{
            id: 'plugin-content-manager-title',
            defaultMessage: `Content Manager > ${this.props.routeParams.slug}`
          }} description={{
            id: 'plugin-content-manager-description',
            defaultMessage: `Manage your ${this.props.routeParams.slug}`
          }} noActions={false}>
          </PluginHeader>
          <Container>
            <p></p>
            {content}
          </Container>
        </div>
      </div>
    );
  }
}

List.propTypes = {
  setCurrentModelName: React.PropTypes.func,
  records: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.bool,
  ]),
  loadRecords: React.PropTypes.func,
  loading: React.PropTypes.bool,
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  currentModelName: React.PropTypes.string,
};

function mapDispatchToProps(dispatch) {
  return {
    setCurrentModelName: (modelName) => dispatch(setCurrentModelName(modelName)),
    loadRecords: () => dispatch(loadRecords()),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  records: makeSelectModelRecords(),
  loading: makeSelectLoading(),
  models: makeSelectModels(),
  currentModelName: makeSelectCurrentModelName(),
});

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(List));
