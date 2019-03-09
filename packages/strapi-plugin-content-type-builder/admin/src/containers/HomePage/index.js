/**
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';

import PluginHeader from 'components/PluginHeader';

import { routerPropTypes } from 'commonPropTypes';

import EmptyContentTypeView from '../../components/EmptyContentTypeView';
import TableList from '../../components/TableList';

import pluginId from '../../pluginId';

import styles from './styles.scss';

import makeSelectHomePage from './selectors';
import reducer from './reducer';
import saga from './saga';


export class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleDeleteModel = (modelName) => {
    this.props.deleteModel(modelName);
  }

  render() {
    const {
      history: {
        push,
      },
      models,
    } = this.props;
    const availableNumber = models.length;
    const title = availableNumber > 1 ? `${pluginId}.table.contentType.title.plural`
      : `${pluginId}.table.contentType.title.singular`;

    const renderViewContent = availableNumber === 0 ?
      <EmptyContentTypeView handleButtonClick={() => {}} />
    : (
      <TableList
        availableNumber={availableNumber}
        title={title}
        buttonLabel={`${pluginId}.button.contentType.add`}
        onButtonClick={() => {}}
        onHandleDelete={this.handleDeleteModel}
        rowItems={this.props.models}
        push={push}
      />
    );

    return (
      <div className={styles.homePage}>
        <PluginHeader
          title={{
            id: `${pluginId}.home.contentTypeBuilder.name`,
          }}
          description={{
            id: `${pluginId}.home.contentTypeBuilder.description`,
            values: {
              label: 'description', // TODO - replace w/ something better
            },
          }}
          actions={[]}
        />
        {renderViewContent}
      </div>
    );
  }
}

HomePage.propTypes = {
  ...routerPropTypes().history,
  deleteModel: PropTypes.func.isRequired,
  models: PropTypes.array.isRequired,
};

const mapStateToProps = createStructuredSelector({
  homepage: makeSelectHomePage(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = strapi.injectReducer({ key: 'homePage', reducer, pluginId });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = strapi.injectSaga({ key: 'homePage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(HomePage);
