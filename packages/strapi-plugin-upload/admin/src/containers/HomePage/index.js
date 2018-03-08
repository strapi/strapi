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
import getQueryParameters from 'utils/getQueryParameters';
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

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
  getChildContext = () => (
    {
      deleteData: this.props.deleteData,
    }
  );

  componentWillMount() {
    if (!isEmpty(this.props.location.search)) {
      const page = parseInt(this.getURLParams('page'), 10);
      const limit = parseInt(this.getURLParams('limit'), 10);
      const sort = this.getURLParams('sort');

      this.props.setParams({ limit, page, sort });
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

  getURLParams = (type) => getQueryParameters(this.props.location.search, type);

  changeSort = (name) => {
    const { params: { limit, page } } = this.props;
    const target = {
      name: 'params.sort',
      value: name,
    };
    const search = `page=${page}&limit=${limit}&sort=${name}`;

    this.props.changeParams({ target });
    this.props.history.push({
      pathname: this.props.history.pathname,
      search,
    });
  }

  handleChangeParams = (e) => {
    const { history, params } = this.props;
    const search = e.target.name === 'params.limit' ?
      `page=${params.page}&limit=${e.target.value}&sort=${params.sort}`
      : `page=${e.target.value}&limit=${params.limit}&sort=${params.sort}`;
    this.props.history.push({
      pathname: history.pathname,
      search,
    });

    this.props.changeParams(e);
  }

  renderInputSearch = () => (
    <InputSearch
      autoFocus
      name="search"
      onChange={this.props.onSearch}
      placeholder="upload.HomePage.InputSearch.placeholder"
      style={{ marginTop: '-10px' }}
      value={this.props.search}
    />
  )

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
          sort={this.props.params.sort}
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
    limit: 10,
    page: 1,
    sort: 'updatedAt',
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

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
