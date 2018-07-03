/**
 * 
 * SettingPage
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import { get, upperFirst } from 'lodash';
import cn from 'classnames';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import { FormattedMessage } from 'react-intl';

import PropTypes from 'prop-types';

import {
  moveAttr,
  onChangeSettings,
  onRemove,
  onReset,
  onSubmit,
} from 'containers/App/actions';
import { makeSelectModifiedSchema } from 'containers/App/selectors';

import BackHeader from 'components/BackHeader';
import Input from 'components/InputsIndex';
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';

import Block from 'components/Block';
import DraggableAttr from 'components/DraggableAttr';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import forms from './forms.json';
import reducer from './reducer';
import saga from './saga';
import makeSelectSettingPage from './selectors';
import styles from './styles.scss';


class SettingPage extends React.PureComponent {
  state = { showWarning: false, isDraggingSibling: false };

  getListDisplay = () => (
    get(this.props.schema, `models.${this.getPath()}.listDisplay`, [])
  );

  getModelName = () => {
    const { match: { params: { slug, endPoint } } } = this.props;

    return endPoint || slug;
  }

  getPath = () => {
    const { match: { params: { slug, source, endPoint } } } = this.props;

    return [slug, source, endPoint]
      .filter(param => param !== undefined)
      .join('.');
  }

  getSelectOptions = (input) => {
    const { schema: { models } } = this.props;
    const currentAttributes = get(models, this.getModelName().concat(['attributes']), []);
    const selectOptions = [get(models, this.getModelName().concat(['primaryKey']), 'id')]
      .concat(Object.keys(currentAttributes)
        .filter(attr => currentAttributes[attr].type !== 'json' && currentAttributes[attr].type !== 'array'));

    return input.name === 'defaultSort' ? selectOptions : input.selectOptions;
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

  getValue = (keys, type) => {
    const value =  get(this.props.schema, ['models'].concat(keys.split('.')));

    return type === 'toggle' ? value : value.toString();

  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({ showWarning: true });
  }

  updateSiblingHoverState = () => {
    this.setState(prevState => ({ isDraggingSibling: !prevState.isDraggingSibling }));
  };

  toggle = () => this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  render() {
    const { isDraggingSibling, showWarning } = this.state;
    const { moveAttr, onChangeSettings, onRemove, onSubmit } = this.props;
    const namePath = this.getPath();

    return (
      <React.Fragment>
        <BackHeader onClick={() => this.props.history.goBack()} />
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            actions={this.getPluginHeaderActions()}
            title={`Content Manager - ${upperFirst(this.getModelName())}`}
            description={{ id: 'content-manager.containers.SettingPage.pluginHeaderDescription' }}
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
              this.toggle();
            }}
          />
          <div className={cn('row', styles.container)}>
            <Block
              description="content-manager.containers.SettingPage.listSettings.description"
              title="content-manager.containers.SettingPage.listSettings.title"
            >
              <form onSubmit={this.handleSubmit} className={styles.ctmForm}>
                <div className="row">
                  <div className="col-md-12">
                    <div className="row">
                      {forms.inputs.map(input => {
                        const inputName = `${namePath}.${input.name}`;

                        return (
                          <Input
                            {...input}
                            key={input.name}
                            name={inputName}
                            onChange={onChangeSettings}
                            selectOptions={this.getSelectOptions(input)}
                            value={this.getValue(inputName, input.type)}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className={styles.separator} />
                  </div>
                </div>
                <div className={styles.listDisplayWrapper}>
                  <div className="row">
                    <div className={cn('col-md-12', styles.draggedDescription)}>
                      <FormattedMessage id="content-manager.containers.SettingPage.attributes" />
                      <p>
                        <FormattedMessage id="content-manager.containers.SettingPage.attributes.description" />
                      </p>
                    </div>
                    <div className="col-md-5">
                      {this.getListDisplay().map((attr, index) => (
                        <div key={attr.name} className={styles.draggedWrapper}>
                          <div>{index}.</div>
                          <DraggableAttr
                            key={attr.name}
                            keys={this.getPath()}
                            index={index}
                            name={attr.name}
                            moveAttr={moveAttr}
                            onRemove={onRemove}
                            updateSiblingHoverState={this.updateSiblingHoverState}
                            isDraggingSibling={isDraggingSibling}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </Block>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

SettingPage.defaultProps = {};

SettingPage.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  moveAttr: PropTypes.func.isRequired,
  onChangeSettings: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
};

const mapDispatchToProps = (dispatch) => (
  bindActionCreators(
    {
      moveAttr,
      onChangeSettings,
      onRemove,
      onReset,
      onSubmit,
    },
    dispatch,
  )
);

const mapStateToProps = createStructuredSelector({
  schema: makeSelectModifiedSchema(),
  settingPage: makeSelectSettingPage(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'settingPage', reducer });
const withSaga = injectSaga({ key: 'settingPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(DragDropContext(HTML5Backend)(SettingPage));
