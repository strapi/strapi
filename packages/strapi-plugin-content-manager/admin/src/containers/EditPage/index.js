/**
 *
 * EditPage
 *
 */

import React from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import PropTypes from 'prop-types';
import { cloneDeep, findIndex, get, includes, isEmpty, isObject, toNumber, toString, replace } from 'lodash';
import cn from 'classnames';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import BackHeader from 'components/BackHeader';
import LoadingIndicator from 'components/LoadingIndicator';
import PluginHeader from 'components/PluginHeader';

// Plugin's components
import Edit from 'components/Edit';
import EditRelations from 'components/EditRelations';

// App selectors
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
import getQueryParameters from 'utils/getQueryParameters';
import { bindLayout } from 'utils/bindLayout';
import inputValidations from 'utils/inputsValidations';

import { checkFormValidity } from 'utils/formValidations';

import {
  changeData,
  getData,
  getLayout,
  initModelProps,
  onCancel,
  resetProps,
  setFileRelations,
  setFormErrors,
  submit,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectEditPage from './selectors';
import styles from './styles.scss';

export class EditPage extends React.Component {
  componentDidMount() {
    this.props.initModelProps(this.getModelName(), this.isCreating(), this.getSource(), this.getModelAttributes());

    if (!this.isCreating()) {
      const mainField = get(this.getModel(), 'info.mainField') || this.getModel().primaryKey;
      this.props.getData(this.props.match.params.id, this.getSource(), mainField);
    } else {
      this.props.getLayout(this.getSource());
    }

    // Get all relations made with the upload plugin
    const fileRelations = Object.keys(get(this.getSchema(), 'relations', {})).reduce((acc, current) => {
      const association = get(this.getSchema(), ['relations', current], {});

      if (association.plugin === 'upload' && association[association.type] === 'file') {
        const relation = {
          name: current,
          multiple: association.nature === 'manyToManyMorph',
        };

        acc.push(relation);
      }
      return acc;
    }, []);

    // Update the reducer so we can use it to create the appropriate FormData in the saga
    this.props.setFileRelations(fileRelations);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.editPage.submitSuccess !== this.props.editPage.submitSuccess) {
      if (!isEmpty(this.props.location.search) && includes(this.props.location.search, '?redirectUrl')) {
        const redirectUrl = this.props.location.search.split('?redirectUrl=')[1];

        this.props.history.push({
          pathname: redirectUrl.split('?')[0],
          search: redirectUrl.split('?')[1],
        });
      } else {
        this.props.history.push({
          pathname: replace(this.props.location.pathname, '/create', ''),
          search: `?source=${this.getSource()}`,
        });
      }
    }
  }

  componentWillUnmount() {
    this.props.resetProps();
  }

  /**
   * Retrive the model's custom layout
   * @return {[type]} [description]
   */
  getLayout = () => (
    bindLayout.call(this, get(this.props.editPage, ['layout', this.getModelName()], {}))
  )

  /**
   *
   *
   * @type {[type]}
   */
  getAttributeValidations = (name) => get(this.props.editPage.formValidations, [findIndex(this.props.editPage.formValidations, ['name', name]), 'validations'], {})

  /**
   * Retrieve the model
   * @type {Object}
   */
  getModel = () => get(this.props.models, ['models', this.getModelName()]) || get(this.props.models, ['plugins', this.getSource(), 'models', this.getModelName()]);

  /**
   * Retrieve specific attribute
   * @type {String} name
   */
  getModelAttribute = (name) => get(this.getModelAttributes(), name);

  /**
   * Retrieve the model's attributes
   * @return {Object}
   */
  getModelAttributes = () => this.getModel().attributes;

  /**
   * Retrieve the model's name
   * @return {String} model's name
   */
  getModelName = () => this.props.match.params.slug.toLowerCase();

  /**
   * Retrieve model's schema
   * @return {Object}
   */
  getSchema = () => this.getSource() !== 'content-manager' ?
    get(this.props.schema, ['plugins', this.getSource(), this.getModelName()])
    : get(this.props.schema, [this.getModelName()]);

  getPluginHeaderTitle = () => {
    if (this.isCreating()) {
      return toString(this.props.editPage.pluginHeaderTitle);
    }

    return this.props.match.params.id;
  }

  /**
   * Retrieve the model's source
   * @return {String}
   */
  getSource = () => getQueryParameters(this.props.location.search, 'source');

  handleBlur = ({ target }) => {
    const defaultValue = get(this.getModelAttribute(target.name), 'default');

    if (isEmpty(target.value) && defaultValue && target.value !== false) {
      return this.props.changeData({
        target: {
          name: `record.${target.name}`,
          value: defaultValue,
        },
      });
    }

    const errorIndex = findIndex(this.props.editPage.formErrors, ['name', target.name]);
    const errors = inputValidations(target.value, this.getAttributeValidations(target.name), target.type);
    const formErrors = cloneDeep(this.props.editPage.formErrors);

    if (errorIndex === -1 && !isEmpty(errors)) {
      formErrors.push({ name: target.name, errors });
    } else if (errorIndex !== -1 && isEmpty(errors)) {
      formErrors.splice(errorIndex, 1);
    } else if (!isEmpty(errors)) {
      formErrors.splice(errorIndex, 1, { name: target.name, errors });
    }

    return this.props.setFormErrors(formErrors);
  }

  handleChange = (e) => {
    let value = e.target.value;
    // Check if date
    if (isObject(e.target.value) && e.target.value._isAMomentObject === true) {
      value = moment(e.target.value, 'YYYY-MM-DD HH:mm:ss').format();
    } else if (['float', 'integer', 'biginteger', 'decimal'].indexOf(get(this.getSchema(), ['fields', e.target.name, 'type'])) !== -1) {
      value = toNumber(e.target.value);
    }

    const target = {
      name: `record.${e.target.name}`,
      value,
    };

    this.props.changeData({ target });
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const formErrors = checkFormValidity(this.generateFormFromRecord(), this.props.editPage.formValidations);

    if (isEmpty(formErrors)) {
      this.props.submit();
    }

    this.props.setFormErrors(formErrors);
  }

  isCreating = () => this.props.match.params.id === 'create';

  isRelationComponentNull = () => (
    Object.keys(get(this.getSchema(), 'relations', {})).filter(relation => (
      get(this.getSchema(), ['relations', relation, 'plugin']) !== 'upload' &&
      (!get(this.getSchema(), ['relations', relation, 'nature'], '').toLowerCase().includes('morph') || !get(this.getSchema(), ['relations', relation, relation]))
    )).length === 0
  )

  // NOTE: technical debt that needs to be redone
  generateFormFromRecord = () => (
    Object.keys(this.getModelAttributes()).reduce((acc, current) => {
      acc[current] = get(this.props.editPage.record, current, '');

      return acc;
    }, {})
  )

  pluginHeaderActions =  () => (
    [
      {
        label: 'content-manager.containers.Edit.reset',
        kind: 'secondary',
        onClick: this.props.onCancel,
        type: 'button',
        disabled: this.showLoaders(),
      },
      {
        kind: 'primary',
        label: 'content-manager.containers.Edit.submit',
        onClick: this.handleSubmit,
        type: 'submit',
        loader: this.props.editPage.showLoader,
        style: this.props.editPage.showLoader ? { marginRight: '18px' } : {},
        disabled: this.showLoaders(),
      },
    ]
  );

  showLoaders = () => {
    const { editPage: { isLoading, layout } } = this.props;

    return isLoading && !this.isCreating() || isLoading && get(layout, this.getModelName()) === undefined;
  }

  render() {
    const { editPage } = this.props;

    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <BackHeader onClick={() => this.props.history.goBack()} />
          <div className={cn('container-fluid', styles.containerFluid)}>
            <PluginHeader
              actions={this.pluginHeaderActions()}
              title={{ id: this.getPluginHeaderTitle() }}
            />
            <div className="row">
              <div className={this.isRelationComponentNull() ? 'col-lg-12' : 'col-lg-9'}>
                <div className={styles.main_wrapper}>
                  {this.showLoaders() ? (
                    <LoadingIndicator />
                  ) : (
                    <Edit
                      attributes={this.getModelAttributes()}
                      didCheckErrors={editPage.didCheckErrors}
                      formValidations={editPage.formValidations}
                      formErrors={editPage.formErrors}
                      layout={this.getLayout()}
                      modelName={this.getModelName()}
                      onBlur={this.handleBlur}
                      onChange={this.handleChange}
                      record={editPage.record}
                      resetProps={editPage.resetProps}
                      schema={this.getSchema()}
                    />
                  )}
                </div>
              </div>
              {!this.isRelationComponentNull() && (
                <div className={cn('col-lg-3')}>
                  <div className={styles.sub_wrapper}>
                    {!this.isRelationComponentNull() && (
                      <EditRelations
                        currentModelName={this.getModelName()}
                        location={this.props.location}
                        changeData={this.props.changeData}
                        record={editPage.record}
                        schema={this.getSchema()}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  }
}

EditPage.contextTypes = {
  plugins: PropTypes.object,
};

EditPage.defaultProps = {
  models: {},
};

EditPage.propTypes = {
  changeData: PropTypes.func.isRequired,
  editPage: PropTypes.object.isRequired,
  getData: PropTypes.func.isRequired,
  getLayout: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  initModelProps: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  models: PropTypes.object,
  onCancel: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  setFileRelations: PropTypes.func.isRequired,
  setFormErrors: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeData,
      getData,
      getLayout,
      initModelProps,
      onCancel,
      resetProps,
      setFileRelations,
      setFormErrors,
      submit,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  editPage: makeSelectEditPage(),
  models: makeSelectModels(),
  schema: makeSelectSchema(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'editPage', reducer });
const withSaga = injectSaga({ key: 'editPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(EditPage);


