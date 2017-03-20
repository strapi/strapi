/*
 *
 * Single
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import Container from 'components/Container';

import {
  setCurrentModel,
  loadRecord,
} from './actions';

import {
  makeSelectRecord,
  makeSelectLoading,
} from './selectors';

export class Single extends React.Component { // eslint-disable-line react/prefer-stateless-function

  componentWillMount() {
    this.props.setCurrentModel(this.props.routeParams.slug.toLowerCase());
    this.props.loadRecord(this.props.routeParams.id);
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
    } else if (this.props.record) {
      const items = [];
      for(var key in this.props.record) {
        items.push(<li key={key}>{key}: {this.props.record[key]}</li>);
      }

      content = (
        <ul>
          {items}
        </ul>
      )
    }

    return (
      <div>
        <div className="container-fluid">
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


Single.propTypes = {
  setCurrentModel: React.PropTypes.func,
  loadRecord: React.PropTypes.func,
  loading: React.PropTypes.bool,
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
};


const mapStateToProps = createStructuredSelector({
  record: makeSelectRecord(),
  loading: makeSelectLoading(),
});

function mapDispatchToProps(dispatch) {
  return {
    setCurrentModel: (model) => dispatch(setCurrentModel(model)),
    loadRecord: (id) => dispatch(loadRecord(id)),
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Single);
