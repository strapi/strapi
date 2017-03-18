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
import ListItem from 'components/ListItem';

import styles from './styles.scss';

import {
  loadRecords
} from './actions';

import {
   makeSelectModelRecords,
   makeSelectLoading,
} from './selectors';

export class List extends React.Component { // eslint-disable-line react/prefer-stateless-function

  componentWillMount() {
    this.props.loadRecords(this.props.routeParams.slug.toLowerCase());
  }

  render() {
    if (this.props.loading) {
      return (
        <div>
          <p>Loading...</p>
        </div>
      );
    }

    const Plugin = this.props.plugin;
    const items = this.props.records.map((record, key) => {
      const destination = this.props.route.path.replace(':slug', this.props.routeParams.slug) + '/' + record.id;

      return (
        <ListItem key={key} destination={destination} {...record} />
      );
    });

    return (
      <div>
        <div className={`container-fluid ${styles.containerFluid}`}>
          <Plugin title={{
            id: 'plugin-content-manager-title',
            defaultMessage: `Content Manager > ${this.props.routeParams.slug}`
          }} description={{
            id: 'plugin-content-manager-description',
            defaultMessage: `Manage your ${this.props.routeParams.slug}`
          }} noActions={false}>
          </Plugin>
          <Container>
            <p></p>
            <ul>
              {items}
            </ul>
          </Container>
        </div>
      </div>
    );
  }
}

List.propTypes = {
  records: React.PropTypes.array,
  loadRecords: React.PropTypes.func,
  loading: React.PropTypes.bool
};

function mapDispatchToProps(dispatch) {
  return {
    loadRecords: (model) => dispatch(loadRecords(model)),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  records: makeSelectModelRecords(),
  loading: makeSelectLoading(),
});

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(List));
