/**
 * 
 * SettingsPage
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import cn from 'classnames';
import { get, sortBy } from 'lodash';
import PropTypes from 'prop-types';

import { onChange, onSubmit, onReset } from 'containers/App/actions';
import { makeSelectModifiedSchema, makeSelectSubmitSuccess } from 'containers/App/selectors';

import Input from 'components/InputsIndex';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';

import Block from 'components/Block';
import SettingsRow from 'components/SettingsRow';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import reducer from './reducer';
import saga from './saga';
import styles from './styles.scss';

import forms from './forms.json';

class SettingsPage extends React.PureComponent {
  state = { showWarning: false };

  componentDidUpdate(prevProps) {
    if (prevProps.submitSuccess !== this.props.submitSuccess) {
      this.toggle();
    }
  }

  getModels = (data = this.props.schema.models, destination = '/') => {
    const models = Object.keys(data).reduce((acc, curr) => {
      if (curr !== 'plugins') {
  
        if (!data[curr].fields && _.isObject(data[curr])) {
          return this.getModels(data[curr], `${destination}${curr}/`);
        }
        
        return acc.concat([{ name: curr, destination: `${destination}${curr}` }]);
      } 
    
      return this.getModels(data[curr], `${destination}${curr}/`);
    }, []);

    return sortBy(
      models.filter(obj => obj.name !== 'permission' && obj.name !== 'role'),
      ['name'],
    );
  }

  getPluginHeaderActions = () => (
    [
      {
        label: 'content-manager.popUpWarning.button.cancel',
        kind: 'secondary',
        onClick: this.props.onReset,
        type: 'button',
      },
      {
        kind: 'primary',
        label: 'content-manager.containers.Edit.submit',
        onClick: this.handleSubmit,
        type: 'submit',
      },
    ]
  );

  getValue = (input) => {
    const { schema: { generalSettings } } = this.props;
    const value = get(generalSettings, input.name.split('.')[1], input.type === 'toggle' ? false : 10);

    return input.type === 'toggle' ? value : value.toString();
  }

  handleClick = (destination) => {
    const { location: { pathname } } = this.props;
    this.props.history.push(`${pathname}${destination}`);
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({ showWarning: true });
  }

  toggle = () => this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  render() {
    const { showWarning } = this.state;
    const { onChange, onSubmit } = this.props;

    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <PluginHeader
          actions={this.getPluginHeaderActions()}
          title="Content Manager"
          description={{ id: 'content-manager.containers.SettingsPage.pluginHeaderDescription' }}
        />
        <PopUpWarning
          isOpen={showWarning}
          toggleModal={this.toggle}
          content={{
            title: 'content-manager.popUpWarning.title',
            message: 'content-manager.popUpWarning.warning.updateAllSettings',
            cancel: 'content-manager.popUpWarning.button.cancel',
            confirm: 'content-manager.popUpWarning.button.confirm',
          }}
          popUpWarningType="danger"
          onConfirm={() => {
            onSubmit();
          }}
        />
        <div className={cn('row', styles.container)}>
          <Block
            description="content-manager.containers.SettingsPage.Block.generalSettings.description"
            title="content-manager.containers.SettingsPage.Block.generalSettings.title"
          >
            <form onSubmit={this.handleSubmit} className={styles.ctmForm}>
              <div className="row">
                <div className="col-md-10">
                  <div className="row">
                    {forms.inputs.map(input => (
                      <Input
                        key={input.name}
                        onChange={onChange}
                        value={this.getValue(input)}
                        {...input}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </Block>
          <Block
            title="content-manager.containers.SettingsPage.Block.contentType.title"
            description="content-manager.containers.SettingsPage.Block.contentType.description"
          >
            <div className={styles.contentTypesWrapper}>
              {this.getModels().map(model => <SettingsRow key={model.name} {...model} onClick={this.handleClick} />)}
            </div>
          </Block>
        </div>
      </div>
    );
  }
}

SettingsPage.defaultProps = {};

SettingsPage.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  submitSuccess: PropTypes.bool.isRequired,
};

const mapDispatchToProps = (dispatch) => (
  bindActionCreators(
    {
      onChange,
      onReset,
      onSubmit,
    },
    dispatch,
  )
);

const mapStateToProps = createStructuredSelector({
  schema: makeSelectModifiedSchema(),
  submitSuccess: makeSelectSubmitSuccess(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'settingsPage', reducer });
const withSaga = injectSaga({ key: 'settingsPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(SettingsPage);
