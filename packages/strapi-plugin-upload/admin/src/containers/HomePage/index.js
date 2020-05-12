/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import { isEmpty } from 'lodash';
import { Header } from '@buffetjs/custom';
import {
  getQueryParameters,
  ContainerFluid,
  InputSearch,
  PageFooter,
  GlobalContext,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { HomePageContextProvider } from '../../contexts/HomePage';

// Plugin's component
import EntriesNumber from '../../components/EntriesNumber';
import List from '../../components/List';
import PluginInputFile from '../../components/PluginInputFile';
import { EntriesWrapper, Wrapper } from './components';

/* eslint-disable */

import {
  changeParams,
  deleteData,
  getData,
  onDrop,
  onSearch,
  setParams,
} from './actions';
import selectHomePage from './selectors';
import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  static contextType = GlobalContext;

  UNSAFE_componentWillMount() {
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

  UNSAFE_componentWillReceiveProps(nextProps) {
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
        : `_page=${e.target.value}&_limit=${params._limit}&_sort=${params._sort}`;
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
      style={{ marginTop: '-11px' }}
      value={this.props.search}
    />
  );

  render() {
    const { formatMessage } = this.context;

    return (
      <HomePageContextProvider deleteData={this.props.deleteData}>
        <ContainerFluid className="container-fluid">
          <Wrapper>
            <Header
              actions={[
                {
                  Component: this.renderInputSearch,
                  key: 'input-search',
                },
              ]}
              title={{
                label: formatMessage({
                  id: 'upload.HomePage.title',
                }),
              }}
              content={formatMessage({
                id: 'upload.HomePage.description',
              })}
            />
          </Wrapper>
          <PluginInputFile
            name="files"
            onDrop={this.props.onDrop}
            showLoader={this.props.uploadFilesLoading}
          />
          <EntriesWrapper>
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
          </EntriesWrapper>
          <List
            data={this.props.uploadedFiles}
            changeSort={this.changeSort}
            sort={this.props.params._sort}
          />
          <div className="col-md-12">
            <PageFooter
              count={this.props.entriesNumber}
              context={{ emitEvent: () => {} }}
              onChangeParams={this.handleChangeParams}
              params={this.props.params}
            />
          </div>
        </ContainerFluid>
      </HomePageContextProvider>
    );
  }
}

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
    dispatch
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = strapi.injectReducer({
  key: 'homePage',
  reducer,
  pluginId,
});
const withSaga = strapi.injectSaga({ key: 'homePage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect
)(injectIntl(HomePage));
