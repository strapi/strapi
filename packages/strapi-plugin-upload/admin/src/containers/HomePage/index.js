/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import { bindActionCreators, compose } from 'redux';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import ContainerFluid from 'components/ContainerFluid';
import InputSearch from 'components/InputSearch';
import PluginHeader from 'components/PluginHeader';


// Utils
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

// Actions
import {
  onSearch,
} from './actions';

// Selectors
import selectHomePage from './selectors';

// Styles
import styles from './styles.scss';

import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  renderInputSearch = () =>
    <InputSearch
      value={this.props.search}
      name="search"
      onChange={this.props.onSearch}
      placeholder="upload.HomePage.InputSearch.placeholder"
      style={{ marginTop: '-10px' }}
    />

  render() {
    return (
      <ContainerFluid>
        <div className={styles.homePageUpload}>
          <PluginHeader
            title={{
              id: 'upload.HomePage.title',
            }}
            description={{
              id: 'upload.HomePage.description',
            }}
            overrideRendering={this.renderInputSearch}
          />

        </div>
      </ContainerFluid>
    );
  }
}

HomePage.contextTypes = {
  router: PropTypes.object,
};

HomePage.propTypes = {
  onSearch: PropTypes.func.isRequired,
  search: PropTypes.string.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      onSearch,
    },
    dispatch,
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
