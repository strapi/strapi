/**
 * 
 * SettingsPage
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import cn from 'classnames';
import { get } from 'lodash';
import PropTypes from 'prop-types';

import { onChange } from 'containers/App/actions';
import { makeSelectSchema } from 'containers/App/selectors';

import PluginHeader from 'components/PluginHeader';
import Input from 'components/InputsIndex';

import Block from 'components/Block';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import reducer from './reducer';
import saga from './saga';
import makeSelectSettingsPage from './selectors';
import styles from './styles.scss';

import forms from './forms.json';

class SettingsPage extends React.PureComponent {
  getPluginHeaderActions = () => (
    [
      {
        label: 'content-manager.popUpWarning.button.cancel',
        kind: 'secondary',
        onClick: () => {},
        type: 'button',
      },
      {
        kind: 'primary',
        label: 'content-manager.containers.Edit.submit',
        onClick: () => {},
        type: 'submit',
      },
    ]
  );

  getValue = (input) => {
    const { schema: { generalSettings } } = this.props;
    const value = get(generalSettings, input.name.split('.')[1], input.type === 'toggle' ? false : 10);

    return input.type === 'toggle' ? value : value.toString();
  }

  render() {
    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <PluginHeader
          actions={this.getPluginHeaderActions()}
          title="Content Manager"
          description={{ id: 'content-manager.containers.SettingsPage.pluginHeaderDescription' }}
        />
        <div className={cn('row', styles.container)}>
          <Block
            description="content-manager.containers.SettingsPage.Block.generalSettings.description"
            title="content-manager.containers.SettingsPage.Block.generalSettings.title"
          >
            <form onSubmit={(e) => e.preventDefault()} className={styles.ctmForm}>
              <div className="row">
                <div className="col-md-10">
                  <div className="row">
                    {forms.inputs.map(input => {

                      return (
                        <Input
                          key={input.name}
                          onChange={this.props.onChange}
                          value={this.getValue(input)}
                          {...input}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>
          </Block>
        </div>
      </div>
    );
  }
}

SettingsPage.defaultProps = {};

SettingsPage.propTypes = {
  onChange: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
};

const mapDispatchToProps = (dispatch) => (
  bindActionCreators(
    {
      onChange,
    },
    dispatch,
  )
);

const mapStateToProps = createStructuredSelector({
  schema: makeSelectSchema(),
  settingsPage: makeSelectSettingsPage(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'settingsPage', reducer });
const withSaga = injectSaga({ key: 'settingsPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(SettingsPage);
