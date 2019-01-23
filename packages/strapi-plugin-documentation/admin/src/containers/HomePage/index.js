/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { bindActionCreators, compose } from 'redux';
import { get, isEmpty } from 'lodash';
import cn from 'classnames';
// Components
import PluginHeader from 'components/PluginHeader';
import PopUpWarning from 'components/PopUpWarning';
import Block from 'components/Block';
import Row from 'components/Row';
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';
import Input from 'components/InputsIndex';
import { pluginId } from 'app';
// Utils
import auth from 'utils/auth';
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
import openWithNewTab from 'utils/openWithNewTab';
// Actions
import {
  getDocInfos,
  onChange,
  onClickDeleteDoc,
  onConfirmDeleteDoc,
  onSubmit,
  onUpdateDoc,
} from './actions';
// Selectors
import selectHomePage from './selectors';
// Styles
import styles from './styles.scss';
import reducer from './reducer';
import saga from './saga';

const makeTranslation = txt => `${pluginId}.containers.HomePage.${txt}`;

export class HomePage extends React.Component {
  componentDidMount() {
    this.props.getDocInfos();
  }

  getRestrictedAccessValue = () => {
    const { form } = this.props;

    return get(form, [0, 0, 'value'], false);
  };

  getPluginHeaderActions = () => {
    return [
      {
        label: makeTranslation('Button.open'),
        className: styles.buttonOutline,
        onClick: this.openCurrentDocumentation,
        type: 'button',
      },
      {
        label: makeTranslation('Button.update'),
        kind: 'primary',
        onClick: () => {},
        type: 'submit',
      },
    ];
  };

  handleCopy = () => {
    strapi.notification.info(makeTranslation('copied'));
  };

  openCurrentDocumentation = () => {
    const { currentDocVersion } = this.props;

    return openWithNewTab(`/documentation/v${currentDocVersion}`);
  };

  shouldHideInput = inputName => {
    return !this.getRestrictedAccessValue() && inputName === 'password';
  };

  toggleModal = () => this.props.onClickDeleteDoc('');

  renderForm = (array, i) => {
    const { didCheckErrors, formErrors } = this.props;

    return (
      <div className="row" key={i}>
        {array.map((input, j) => {
          if (this.shouldHideInput(input.name)) {
            return null;
          }

          return (
            <Input
              key={input.name}
              {...input}
              didCheckErrors={didCheckErrors}
              errors={get(formErrors, [input.name], [])}
              name={`form.${i}.${j}.value`}
              onChange={this.props.onChange}
            />
          );
        })}
      </div>
    );
  };

  renderRow = data => {
    const { currentDocVersion, onClickDeleteDoc, onUpdateDoc } = this.props;

    return (
      <Row
        currentDocVersion={currentDocVersion}
        data={data}
        key={data.generatedDate}
        onClickDelete={onClickDeleteDoc}
        onUpdateDoc={onUpdateDoc}
      />
    );
  };

  render() {
    const {
      docVersions,
      form,
      isLoading,
      onConfirmDeleteDoc,
      onSubmit,
      versionToDelete,
    } = this.props;

    if (isLoading) {
      return <LoadingIndicatorPage />;
    }

    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <PopUpWarning
          isOpen={!isEmpty(versionToDelete)}
          toggleModal={this.toggleModal}
          content={{
            title: 'components.popUpWarning.title',
            message: makeTranslation('PopUpWarning.message'),
            cancel: 'app.components.Button.cancel',
            confirm: makeTranslation('PopUpWarning.confirm'),
          }}
          popUpWarningType="danger"
          onConfirm={onConfirmDeleteDoc}
        />
        <form onSubmit={onSubmit}>
          <PluginHeader
            actions={this.getPluginHeaderActions()}
            title={{ id: makeTranslation('PluginHeader.title') }}
            description={{ id: makeTranslation('PluginHeader.description') }}
          />
          <div className={cn('row', styles.container)}>
            <Block>
              <CopyToClipboard text={auth.getToken()} onCopy={this.handleCopy}>
                <div className="row" style={{ zIndex: '99' }}>
                  <Input
                    style={{ zIndex: '9', cursor: 'pointer' }}
                    inputStyle={{ cursor: 'pointer' }}
                    name="jwtToken"
                    value={auth.getToken()}
                    type="string"
                    onChange={() => {}}
                    label={{ id: makeTranslation('form.jwtToken') }}
                    inputDescription={{
                      id: makeTranslation('form.jwtToken.description'),
                    }}
                  />
                </div>
              </CopyToClipboard>
            </Block>
            <Block>{form.map(this.renderForm)}</Block>
            <Block title={makeTranslation('Block.title')}>
              <div className={styles.wrapper}>
                <Row isHeader />
                {docVersions.map(this.renderRow)}
              </div>
            </Block>
          </div>
        </form>
      </div>
    );
  }
}

HomePage.defaultProps = {
  currentDocVersion: '',
  didCheckErrors: false,
  docVersions: [],
  form: [],
  formErrors: [],
  isLoading: true,
  onChange: () => {},
  onClickDeleteDoc: () => {},
  onConfirmDeleteDoc: () => {},
  onSubmit: () => {},
  onUpdateDoc: () => {},
  versionToDelete: '',

};

HomePage.propTypes = {
  currentDocVersion: PropTypes.string,
  didCheckErrors: PropTypes.bool,
  docVersions: PropTypes.array,
  form: PropTypes.array,
  formErrors: PropTypes.array,
  getDocInfos: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onChange: PropTypes.func,
  onClickDeleteDoc: PropTypes.func,
  onConfirmDeleteDoc: PropTypes.func,
  onSubmit: PropTypes.func,
  onUpdateDoc: PropTypes.func,
  versionToDelete: PropTypes.string,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getDocInfos,
      onChange,
      onClickDeleteDoc,
      onConfirmDeleteDoc,
      onSubmit,
      onUpdateDoc,
    },
    dispatch,
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);
const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
