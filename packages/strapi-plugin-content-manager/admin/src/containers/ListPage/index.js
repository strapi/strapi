/**
 *
 * ListPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import { capitalize, findIndex, get, isUndefined, toInteger, upperFirst } from 'lodash';
import { ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';
// App selectors
import { makeSelectSchema } from 'containers/App/selectors';
// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PageFooter from 'components/PageFooter';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';
import InputCheckbox from 'components/InputCheckbox';
// Components from the plugin itself
import AddFilterCTA from 'components/AddFilterCTA';
import FiltersPickWrapper from 'components/FiltersPickWrapper/Loadable';
import Filter from 'components/Filter/Loadable';
import Search from 'components/Search';
import Table from 'components/Table';
// Utils located in `strapi/packages/strapi-helper-plugin/lib/src/utils`;
import getQueryParameters from 'utils/getQueryParameters';
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
import storeData from 'utils/storeData';
import Div from './Div';
import {
  addAttr,
  addFilter,
  changeParams,
  deleteData,
  deleteSeveralData,
  getData,
  onChange,
  onClickRemove,
  onClickSelect,
  onClickSelectAll,
  onToggleDeleteAll,
  onToggleFilters,
  openFiltersWithSelections,
  removeAllFilters,
  removeAttr,
  removeFilter,
  resetDisplayedFields,
  setDisplayedFields,
  setParams,
  submit,
} from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectListPage from './selectors';
import {
  generateFiltersFromSearch,
  generateSearchFromFilters,
  generateSearchFromParams,
  generateRedirectURI,
} from './utils';
import styles from './styles.scss';

export class ListPage extends React.Component {
  state = { isOpen: false, showWarning: false, target: '' };

  componentDidMount() {
    this.getData(this.props);
    this.setTableHeaders();
  }

  componentDidUpdate(prevProps) {
    const {
      location: { pathname, search },
    } = prevProps;
    const {
      listPage: { didChangeDisplayedFields, filtersUpdated, displayedFields, params: { _sort } },
    } = this.props;

    if (pathname !== this.props.location.pathname) {
      this.getData(this.props);
      this.shouldHideFilters();
      this.setTableHeaders();
    }

    if (search !== this.props.location.search) {
      this.getData(this.props, true);
    }

    if (prevProps.listPage.filtersUpdated !== filtersUpdated) {
      const updatedSearch = this.generateSearch();
      this.props.history.push({ pathname, search: updatedSearch });
    }

    if (prevProps.listPage.didChangeDisplayedFields !== didChangeDisplayedFields) {
      const dataToStore = {
        [this.getCurrentModelName()]: {
          displayedFields,
          _sort,
        },
      };
      storeData.set(this.getCurrentModelName(), dataToStore);
    }
  }

  componentWillUnmount() {
    if (this.props.listPage.showFilter) {
      this.props.onToggleFilters();
    }
  }

  getAllModelFields = () => {
    const attributes = this.getCurrentModelAttributes();

    return Object.keys(attributes)
      .filter(attr => {
        return !attributes[attr].hasOwnProperty('collection') && !attributes[attr].hasOwnProperty('model');
      });
  }

  /**
   * Helper to retrieve the current model data
   * @return {Object} the current model
   */
  getCurrentModel = () => (
    get(this.props.schema, ['models', this.getCurrentModelName()]) ||
    get(this.props.schema, ['models', 'plugins', this.getSource(), this.getCurrentModelName()])
  );

  getCurrentModelAttributes = () => {
    const primaryKey = this.getModelPrimaryKey();
    const defaultAttr = { name: primaryKey, label: 'Id', type: 'string', searchable: true, sortable: true };
    const attributes = Object.assign({ [primaryKey]: defaultAttr }, get(this.getCurrentModel(), ['attributes'], {}));

    return attributes;
  }

  getCurrentModelDefaultLimit = () => (
    get(this.getCurrentModel(), 'pageEntries', 10)
  );

  getCurrentModelDefaultSort = () => {
    const sortAttr = get(this.getCurrentModel(), 'defaultSort', 'id');
    const order = get(this.getCurrentModel(), 'sort', 'ASC');

    return order === 'ASC' ? sortAttr : `-${sortAttr}`;
  };

  /**
   * Helper to retrieve the current model name
   * @return {String} the current model's name
   */
  getCurrentModelName = () => this.props.match.params.slug;

  /**
   * Function to fetch data
   * @param  {Object} props
   */
  getData = (props, setUpdatingParams = false) => {
    const source = getQueryParameters(props.location.search, 'source');
    const _limit = toInteger(getQueryParameters(props.location.search, '_limit')) || this.getCurrentModelDefaultLimit();
    const _page = toInteger(getQueryParameters(props.location.search, '_page')) || 1;
    const _sort = this.findPageSort(props); // TODO sort
    const _q = getQueryParameters(props.location.search, '_q') || '';
    const params = { _limit, _page, _sort, _q };
    const filters = generateFiltersFromSearch(props.location.search);

    this.props.setParams(params, filters);
    this.props.getData(props.match.params.slug, source, setUpdatingParams);
  };

  getDataFromStore = (key) => {
    return get(storeData.get(this.getCurrentModelName()),[this.getCurrentModelName(), key]);
  }

  /**
   * Helper to retrieve the model's source
   * @return {String} the model's source
   */
  getSource = () => getQueryParameters(this.props.location.search, 'source') || 'content-manager';

  /**
   * Retrieve the model's schema
   * @return {Object} Fields
   */
  getCurrentSchema = () => 
    get(this.props.schema, ['models', this.getCurrentModelName(), 'fields']) ||
    get(this.props.schema, ['models', 'plugins', this.getSource(), this.getCurrentModelName(), 'fields']);

  getPopUpDeleteAllMsg = () => (
    this.props.listPage.entriesToDelete.length > 1 ?
      'content-manager.popUpWarning.bodyMessage.contentType.delete.all'
      : 'content-manager.popUpWarning.bodyMessage.contentType.delete'
  );

  getModelPrimaryKey = () => (
    get(this.getCurrentModel(), ['primaryKey'], '_id')
  );

  getTableHeaders = () => (
    get(this.props.listPage, ['displayedFields'], [])
  );

  setTableHeaders = () => {
    const defaultTableHeaders = this.getDataFromStore('displayedFields') || get(this.getCurrentModel(), ['listDisplay'], []);
    this.props.setDisplayedFields(defaultTableHeaders);
  }

  /**
   * Generate the redirect URI when editing an entry
   * @type {String}
   */
  generateRedirectURI = generateRedirectURI.bind(this);

  generateSearch = () => {
    const {
      listPage: { filters, params },
    } = this.props;

    return `?${generateSearchFromParams(params)}&source=${this.getSource()}${generateSearchFromFilters(filters)}`;
  }

  areAllEntriesSelected = () => {
    const { listPage: { entriesToDelete, records } } = this.props;

    return entriesToDelete.length === get(records, this.getCurrentModelName(), []).length && get(records, this.getCurrentModelName(), []).length > 0;
  };

  findAttrIndex = attr => {
    return findIndex(this.props.listPage.displayedFields, ['name', attr]);
  }

  /**
   * [findPageSort description]
   * @param  {Object} props [description]
   * @return {String}      the model's primaryKey
   */
  findPageSort = props => {
    return (
      getQueryParameters(props.location.search, '_sort') ||
      this.getDataFromStore('_sort') ||
      this.getCurrentModelDefaultSort()
    );
  };

  handleChangeHeader = ({ target }) => {
    const defaultSettingsDisplay = get(this.getCurrentModel(), ['listDisplay']);
    const attrIndex = this.findAttrIndex(target.name);
    const defaultSettingsAttrIndex = findIndex(defaultSettingsDisplay, ['name', target.name]);

    if (attrIndex !== -1) {
      if (get(this.props.listPage, 'displayedFields', []).length === 1) {
        strapi.notification.error('content-manager.notification.error.displayedFields');
      } else {
        const isRemovingDefaultSort = get(this.props.listPage, ['params', '_sort']) === target.name;
        let newDefaultSort;

        if (isRemovingDefaultSort) {
          this.props.listPage.displayedFields
            .filter(attr => attr.name !== target.name)
            .forEach(attr => {
              if (attr.sortable && !newDefaultSort) {
                newDefaultSort = attr.name;
              }
            });

          // TODO: store model default sort

          this.handleChangeSort(newDefaultSort || this.getModelPrimaryKey());
        }
        this.props.removeAttr(attrIndex);
      }
    } else {
      const attributes = this.getCurrentModelAttributes();
      const searchable = attributes[target.name].type !== 'json' && attributes[target.name] !== 'array';
      const attrToAdd = defaultSettingsAttrIndex !== -1 
        ? get(defaultSettingsDisplay, [defaultSettingsAttrIndex], {})
        : Object.assign(attributes[target.name], { name: target.name, label: upperFirst(target.name), searchable, sortable: searchable });
      
      this.props.addAttr(attrToAdd, defaultSettingsAttrIndex);
    }
  }

  handleChangeParams = e => {
    const {
      history,
      listPage: { filters, params },
    } = this.props;
    const _q = params._q !== '' ? `&_q=${params._q}` : '';
    const searchEnd  = `&_sort=${params._sort}${_q}&source=${this.getSource()}${generateSearchFromFilters(filters)}`;
    const search =
      e.target.name === 'params._limit'
        ? `_page=${params._page}&_limit=${e.target.value}${searchEnd}`
        : `_page=${e.target.value}&_limit=${params._limit}${searchEnd}`;

    this.props.history.push({
      pathname: history.pathname,
      search,
    });

    this.props.changeParams(e);
  };

  handleChangeSort = sort => {
    const target = {
      name: 'params._sort',
      value: sort,
    };
    const {
      listPage: { filters, params },
    } = this.props;
    const _q = params._q !== '' ? `&_q=${params._q}` : '';
    this.props.history.push({
      pathname: this.props.location.pathname,
      search: `?_page=${params._page}&_limit=${
        params._limit
      }&_sort=${sort}${_q}&source=${this.getSource()}${generateSearchFromFilters(filters)}`,
    });

    this.props.changeParams({ target });
  };

  handleDelete = e => {
    e.preventDefault();
    e.stopPropagation();
    this.props.deleteData(this.state.target, this.getCurrentModelName(), this.getSource());
    this.setState({ showWarning: false });
  };

  handleResetDisplayedFields = () => {
    storeData.clear(this.getCurrentModelName());
    this.props.resetDisplayedFields(get(this.getCurrentModel(), ['listDisplay'], []));
  }

  handleSubmit = e => {
    try {
      e.preventDefault();
    } catch (err) {
      // Silent
    } finally {
      this.props.submit();
    }
  };

  isAttrInitiallyDisplayed = attr => {
    return this.findAttrIndex(attr) !== -1;
  }

  shouldHideFilters = () => {
    if (this.props.listPage.showFilter) {
      this.props.onToggleFilters();
    }
  };

  showLoaders = () => {
    const { listPage: { isLoading, records, updatingParams } } = this.props;

    return updatingParams || isLoading && get(records, this.getCurrentModelName()) === undefined;
  }

  showSearch = () => get(this.getCurrentModel(), ['search']);

  showFilters = () => get(this.getCurrentModel(), ['filters']);

  showBulkActions = () => get(this.getCurrentModel(), ['bulkActions']);

  toggle = () => this.setState(prevState => ({ isOpen: !prevState.isOpen }));

  toggleModalWarning = e => {
    if (!isUndefined(e)) {
      e.preventDefault();
      e.stopPropagation();
      this.setState({
        target: e.target.id,
      });
    }

    if (this.props.listPage.entriesToDelete.length > 0) {
      this.props.onClickSelectAll();
    }
    this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  };

  renderDropdown = item => {
    return (
      <DropdownItem key={item}>
        <div>
          <InputCheckbox onChange={this.handleChangeHeader} name={item} value={this.isAttrInitiallyDisplayed(item)} />
        </div>
      </DropdownItem>
    );
  }

  renderDropdownHeader = msg => {
    return (
      <DropdownItem>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            {msg}
          </span>
          <FormattedMessage id="content-manager.containers.Edit.reset">
            {m => (
              <span onClick={this.handleResetDisplayedFields}>
                {m}
              </span>
            )}
          </FormattedMessage>
        </div>
      </DropdownItem>
    );
  }

  renderFilter = (filter, key) => {
    return (
      <Filter
        key={key}
        filter={filter}
        index={key}
        onClick={this.props.onClickRemove}
        onClickOpen={this.props.openFiltersWithSelections} // eslint-disable-line react/jsx-handler-names
        schema={this.getCurrentSchema()}
      />
    );
  }

  renderPluginHeader = () => {
    const pluginHeaderActions = [
      {
        label: 'content-manager.containers.List.addAnEntry',
        labelValues: {
          entity: capitalize(this.props.match.params.slug) || 'Content Manager',
        },
        kind: 'primaryAddShape',
        onClick: () =>
          this.props.history.push({
            pathname: `${this.props.location.pathname}/create`,
            search: this.generateRedirectURI(),
          }),
      },
    ];
    const { listPage: { count } } = this.props;

    return (
      <PluginHeader
        actions={pluginHeaderActions}
        description={{
          id:
          get(count, this.getCurrentModelName(), 0) > 1
            ? 'content-manager.containers.List.pluginHeaderDescription'
            : 'content-manager.containers.List.pluginHeaderDescription.singular',
          values: {
            label: get(count, this.getCurrentModelName(), 0),
          },
        }}
        title={{
          id: this.getCurrentModelName() || 'Content Manager',
        }}
        withDescriptionAnim={this.showLoaders()}
      />
    );
  }

  renderPopUpWarningDeleteAll = () => {
    const { deleteSeveralData, listPage: { entriesToDelete, showWarningDeleteAll }, onToggleDeleteAll } = this.props;

    return (
      <PopUpWarning
        isOpen={showWarningDeleteAll}
        toggleModal={onToggleDeleteAll}
        content={{
          title: 'content-manager.popUpWarning.title',
          message: this.getPopUpDeleteAllMsg(),
          cancel: 'content-manager.popUpWarning.button.cancel',
          confirm: 'content-manager.popUpWarning.button.confirm',
        }}
        popUpWarningType="danger"
        onConfirm={() => {
          deleteSeveralData(entriesToDelete, this.getCurrentModelName(), this.getSource());
        }}
      />
    );
  }

  render() {
    const {
      addFilter,
      listPage,
      listPage: {
        appliedFilters,
        count,
        entriesToDelete,
        filters,
        filterToFocus,
        records,
        params,
        showFilter,
      },
      onChange,
      onClickSelect,
      onClickSelectAll,
      onToggleDeleteAll,
      onToggleFilters,
      removeAllFilters,
      removeFilter,
    } = this.props;
    const { isOpen } = this.state;

    return (
      <div>
        <div className={cn('container-fluid', styles.containerFluid)}>
          {this.showSearch() && (
            <Search
              changeParams={this.props.changeParams}
              initValue={getQueryParameters(this.props.location.search, '_q') || ''}
              model={this.getCurrentModelName()}
              value={params._q}
            />
          )}
          {this.renderPluginHeader()}

          <div className={cn(styles.wrapper)}>
            {this.showFilters() && (
              <React.Fragment>
                <FiltersPickWrapper
                  addFilter={addFilter}
                  appliedFilters={appliedFilters}
                  close={onToggleFilters}
                  filterToFocus={filterToFocus}
                  modelName={this.getCurrentModelName()}
                  onChange={onChange}
                  onSubmit={this.handleSubmit}
                  removeAllFilters={removeAllFilters}
                  removeFilter={removeFilter}
                  schema={this.getCurrentSchema()}
                  show={showFilter}
                />
                <div className={cn('row', styles.row)}>
                  <div className="col-md-10">
                    <Div
                      decreaseMarginBottom={filters.length > 0}
                    >
                      <div className="row">
                        <AddFilterCTA onClick={onToggleFilters} showHideText={showFilter} />
                        {filters.map(this.renderFilter)}
                      </div>
                    </Div>
                  </div>
                  <div className="col-md-2">
                    <div className={cn(isOpen ? styles.listPageDropdownWrapperOpen : styles.listPageDropdownWrapperClose, styles.listPageDropdownWrapper, )}>
                      <ButtonDropdown isOpen={isOpen} toggle={this.toggle} direction="left">
                        <DropdownToggle />
                        <DropdownMenu>
                          <FormattedMessage id="content-manager.containers.ListPage.displayedFields">
                            {this.renderDropdownHeader}
                          </FormattedMessage>
                          {this.getAllModelFields().map(this.renderDropdown)}
                        </DropdownMenu>
                      </ButtonDropdown>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )}
            <div className={cn('row', styles.row)}>
              <div className="col-md-12">
                <Table
                  deleteAllValue={this.areAllEntriesSelected()}
                  entriesToDelete={entriesToDelete}
                  enableBulkActions={this.showBulkActions()}
                  filters={filters}
                  handleDelete={this.toggleModalWarning}
                  headers={this.getTableHeaders()}
                  history={this.props.history}
                  onChangeSort={this.handleChangeSort}
                  onClickSelectAll={onClickSelectAll}
                  onClickSelect={onClickSelect}
                  onToggleDeleteAll={onToggleDeleteAll}
                  primaryKey={this.getModelPrimaryKey()}
                  records={get(records, this.getCurrentModelName(), [])}
                  redirectUrl={this.generateRedirectURI()}
                  route={this.props.match}
                  routeParams={this.props.match.params}
                  search={params._q}
                  showLoader={this.showLoaders()}
                  sort={params._sort}
                />
                <PopUpWarning
                  isOpen={this.state.showWarning}
                  toggleModal={this.toggleModalWarning}
                  content={{
                    title: 'content-manager.popUpWarning.title',
                    message: 'content-manager.popUpWarning.bodyMessage.contentType.delete',
                    cancel: 'content-manager.popUpWarning.button.cancel',
                    confirm: 'content-manager.popUpWarning.button.confirm',
                  }}
                  popUpWarningType="danger"
                  onConfirm={this.handleDelete}
                />
                {this.renderPopUpWarningDeleteAll()}
                <PageFooter
                  count={get(count, this.getCurrentModelName(), 0)}
                  onChangeParams={this.handleChangeParams}
                  params={listPage.params}
                  style={{ marginTop: '2.9rem', padding: '0 15px 0 15px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ListPage.propTypes = {
  addAttr: PropTypes.func.isRequired,
  addFilter: PropTypes.func.isRequired,
  changeParams: PropTypes.func.isRequired,
  deleteData: PropTypes.func.isRequired,
  deleteSeveralData: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  listPage: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onClickRemove: PropTypes.func.isRequired,
  onClickSelect: PropTypes.func.isRequired,
  onClickSelectAll: PropTypes.func.isRequired,
  onToggleDeleteAll: PropTypes.func.isRequired,
  onToggleFilters: PropTypes.func.isRequired,
  openFiltersWithSelections: PropTypes.func.isRequired,
  removeAllFilters: PropTypes.func.isRequired,
  removeAttr: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  resetDisplayedFields: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  setDisplayedFields: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addAttr,
      addFilter,
      changeParams,
      deleteData,
      deleteSeveralData,
      getData,
      onChange,
      onClickRemove,
      onClickSelect,
      onClickSelectAll,
      onToggleDeleteAll,
      onToggleFilters,
      openFiltersWithSelections,
      removeAllFilters,
      removeAttr,
      removeFilter,
      resetDisplayedFields,
      setDisplayedFields,
      setParams,
      submit,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  listPage: makeSelectListPage(),
  schema: makeSelectSchema(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'listPage', reducer });
const withSaga = injectSaga({ key: 'listPage', saga });

export default compose(withReducer, withSaga, withConnect)(ListPage);
