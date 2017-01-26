/*
 *
 * Single
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import {
  loadRecord
} from './actions';

import {
  selectSingle
} from './selectors';

export class Single extends React.Component { // eslint-disable-line react/prefer-stateless-function

  componentWillMount() {
    this.props.loadRecord(this.props.routeParams.slug, this.props.routeParams.id);
  }

  render() {
    const display = [];

    for(var key in this.props.record) {
      display.push(<li key={key}>{this.props.record[key]}</li>);
    }
    return (
      <ul>
        {display}
      </ul>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  record: selectSingle()
});

function mapDispatchToProps(dispatch) {
  return {
    loadRecord: (model, id) => dispatch(loadRecord(model, id)),
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Single);
