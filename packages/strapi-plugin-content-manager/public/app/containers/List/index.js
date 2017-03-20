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
  setCurrentModel,
  loadRecords,
} from './actions';

import {
  makeSelectLoading,
  makeSelectModelRecords,
} from './selectors';

export class List extends React.Component { // eslint-disable-line react/prefer-stateless-function

  componentWillMount() {
    this.props.setCurrentModel(this.props.routeParams.slug.toLowerCase());
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
      const items = this.props.records.map((record, key) => {
        const destination = this.props.route.path.replace(':slug', this.props.routeParams.slug) + '/' + record.id;

        return (
          <ListItem key={key} destination={destination} {...record} />
        );
      });

      content = (
        <ul>
          {items}
        </ul>
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
  setCurrentModel: React.PropTypes.func,
  records: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.bool,
  ]),
  loadRecords: React.PropTypes.func,
  loading: React.PropTypes.bool
};

function mapDispatchToProps(dispatch) {
  return {
    setCurrentModel: (model) => dispatch(setCurrentModel(model)),
    loadRecords: () => dispatch(loadRecords()),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  records: makeSelectModelRecords(),
  loading: makeSelectLoading(),
});

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(List));
