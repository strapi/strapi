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
// import InputSelect from 'components/InputSelect';
import PageFooter from 'components/PageFooter';
import PluginHeader from 'components/PluginHeader';

// Plugin's component
import EntriesNumber from 'components/EntriesNumber';
import List from 'components/List';
import PluginInputFile from 'components/PluginInputFile';

// Utils
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

// Actions
import {
  changeParams,
  deleteData,
  getData,
  onDrop,
  onSearch,
} from './actions';

// Selectors
import selectHomePage from './selectors';

// Styles
import styles from './styles.scss';

import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  getChildContext = () => (
    {
      deleteData: this.props.deleteData,
    }
  );

  componentDidMount() {
    this.props.getData();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.deleteSuccess !== this.props.deleteSuccess) {
      this.props.getData();
    }
  }

  handleChangeParams = (e) => {
    const { history, params } = this.props;
    const search = e.target.name === 'params.limit' ?
      `page=${params.page}&limit=${e.target.value}&sort=${params.sort}`
      : `page=${e.target.value}&limit=${params.limit}&sort=${params.sort}`
    this.props.history.push({
      pathname: history.pathname,
      search,
    });

    this.props.changeParams(e);
  }

  renderInputSearch = () =>
    <InputSearch
      autoFocus
      name="search"
      onChange={this.props.onSearch}
      placeholder="upload.HomePage.InputSearch.placeholder"
      style={{ marginTop: '-10px' }}
      value={this.props.search}
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
          <PluginInputFile
            name="files"
            onDrop={this.props.onDrop}
          />
        <div className={styles.entriesWrapper}>
          <div>
            {/* NOTE: Prepare for bulk actions}
            <InputSelect
              name="bulkAction"
              onChange={() => console.log('change')}
              selectOptions={[{ value: 'select all'}]}
              style={{ minWidth: '200px', height: '32px', marginTop: '-8px' }}
            />
            */}
          </div>
          <EntriesNumber number={this.props.entriesNumber} />
        </div>
        <List
          data={this.props.uploadedFiles}
        />
        <div className="col-md-12">
          <PageFooter
            count={this.props.entriesNumber}
            onChangeParams={this.handleChangeParams}
            params={this.props.params}
          />
        </div>
      </ContainerFluid>
    );
  }
}

HomePage.childContextTypes = {
  deleteData: PropTypes.func.isRequired,
};

HomePage.contextTypes = {
  router: PropTypes.object,
  uploadedFiles: PropTypes.arrayOf(PropTypes.object),
};

HomePage.defaultProps = {
  params: {
    limit: 10,
    page: 1,
    sort: 'updatedAt',
  },
  uploadedFiles: [{}],
};

HomePage.propTypes = {
  changeParams: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  search: PropTypes.string.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeParams,
      deleteData,
      getData,
      onDrop,
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
