/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
// import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import { isEmpty } from 'lodash';

import {
  getQueryParameters,
  ContainerFluid,
  InputSearch,
  PageFooter,
  PluginHeader,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

// Plugin's component
import EntriesNumber from '../../components/EntriesNumber';
import List from '../../components/List';
import PluginInputFile from '../../components/PluginInputFile';

// Actions
import {
  changeParams,
  deleteData,
  getData,
  onDrop,
  onSearch,
  setParams,
} from './actions';

// Selectors
import selectHomePage from './selectors';

// Styles
import styles from './styles.scss';

import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  getChildContext = () => ({
    deleteData: this.props.deleteData,
  });

  componentWillMount() {
    if (!isEmpty(this.props.location.search)) {
      const _page = parseInt(this.getURLParams('_page'), 10);
      const _limit = parseInt(this.getURLParams('_limit'), 10);
      const _sort = this.getURLParams('_sort');

      this.props.setParams({ _limit, _page, _sort });
    }
  }
  componentDidMount() {
    this.props.getData();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.deleteSuccess !== this.props.deleteSuccess) {
      this.props.getData();
    }
    if (nextProps.location.search !== this.props.location.search) {
      this.props.getData();
    }
  }

  getURLParams = type => getQueryParameters(this.props.location.search, type);

  changeSort = name => {
    const {
      params: { _limit, _page },
    } = this.props;
    const target = {
      name: 'params._sort',
      value: name,
    };
    const search = `_page=${_page}&_limit=${_limit}&_sort=${name}`;

    this.props.changeParams({ target });
    this.props.history.push({
      pathname: this.props.history.pathname,
      search,
    });
  };

  handleChangeParams = e => {
    const { history, params } = this.props;
    const search =
      e.target.name === 'params._limit'
        ? `_page=${params._page}&_limit=${e.target.value}&_sort=${params._sort}`
        : `_page=${e.target.value}&_limit=${params._limit}&_sort=${
          params._sort
        }`;
    this.props.history.push({
      pathname: history.pathname,
      search,
    });

    this.props.changeParams(e);
  };

  renderInputSearch = () => (
    <InputSearch
      autoFocus
      name="search"
      onChange={this.props.onSearch}
      placeholder="upload.HomePage.InputSearch.placeholder"
      style={{ marginTop: '-10px' }}
      value={this.props.search}
    />
  );

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
          showLoader={this.props.uploadFilesLoading}
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
          changeSort={this.changeSort}
          sort={this.props.params._sort}
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
};

HomePage.defaultProps = {
  params: {
    _limit: 10,
    _page: 1,
    _sort: 'updatedAt',
  },
  uploadedFiles: [],
};

HomePage.propTypes = {
  changeParams: PropTypes.func.isRequired,
  deleteData: PropTypes.func.isRequired,
  deleteSuccess: PropTypes.bool.isRequired,
  entriesNumber: PropTypes.number.isRequired,
  getData: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  onDrop: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  params: PropTypes.object,
  search: PropTypes.string.isRequired,
  setParams: PropTypes.func.isRequired,
  uploadedFiles: PropTypes.arrayOf(PropTypes.object),
  uploadFilesLoading: PropTypes.bool.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeParams,
      deleteData,
      getData,
      onDrop,
      onSearch,
      setParams,
    },
    dispatch,
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

const withReducer = strapi.injectReducer({
  key: 'homePage',
  reducer,
  pluginId,
});
const withSaga = strapi.injectSaga({ key: 'homePage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
