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
import { get, toNumber, toString } from 'lodash';
import cn from 'classnames';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import BackHeader from 'components/BackHeader';
import PluginHeader from 'components/PluginHeader';

// App selectors
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
import getQueryParameters from 'utils/getQueryParameters';
import { bindLayout } from 'utils/bindLayout';

// Layout
import layout from '../../../../config/layout';


import {
  changeData,
  getData,
  initModelProps,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectEditPage from './selectors';
import styles from './styles.scss';

export class EditPage extends React.Component {
  componentDidMount() {
    this.props.initModelProps(this.getModelName(), this.isCreating(), this.getSource(), this.getModelAttributes());
    this.layout = bindLayout.call(
      this,
      get(this.context.plugins.toJS(), `${this.getSource()}.layout`, layout),
    );

    if (!this.isCreating()) {
      const mainField = get(this.getModel(), 'info.mainField') || this.getModel().primaryKey;
      this.props.getData(this.props.match.params.id, this.getSource(), mainField);
    }
  }

  /**
   * Retrive the model
   * @type {Object}
   */
  getModel = () => get(this.props.models, ['models', this.getModelName()]) || get(this.props.models, ['plugins', this.getSource(), 'models', this.getModelName()]);

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


  /**
   * Retrieve the model's source
   * @return {String}
   */
  getSource = () => getQueryParameters(this.props.location.search, 'source');

  handleChange = (e) => {
    let value = e.target.value;

    // Check if date
    if (isObject(e.target.value) && e.target.value._isAMomentObject === true) {
      value = moment(e.target.value, 'YYYY-MM-DD HH:mm:ss').format();
    } else if (['float', 'integer', 'biginteger', 'decimal'].indexOf(this.getSchema().fields[e.target.name].type) !== -1) {
      value = toNumber(e.target.value);
    }

    const target = {
      name: e.target.name,
      value,
    };

    this.props.changeData({ target });
  }

  layout = bindLayout.call(this, layout);

  componentDidCatch(error, info) {
    console.log('err', error);
    console.log('info', info);
  }

  isCreating = () => this.props.match.params.id === 'create';

  pluginHeaderActions = [
    {
      label: 'content-manager.containers.Edit.reset',
      kind: 'secondary',
      onClick: () => {},
      type: 'button',
    },
    {
      kind: 'primary',
      label: !this.isCreating() ? 'content-manager.containers.Edit.editing' : 'content-manager.containers.Edit.submit',
      onClick: () => {},
      type: 'submit',
    },
  ];

  render() {
    const { editPage } = this.props;

    return (
      <div>
        <BackHeader onClick={() => this.props.history.goBack()} />
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            actions={this.pluginHeaderActions}
            title={{ id: toString(editPage.pluginHeaderTitle) }}
          />
        </div>
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
  history: PropTypes.object.isRequired,
  initModelProps: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  models: PropTypes.object,
  schema: PropTypes.object.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeData,
      getData,
      initModelProps,
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
