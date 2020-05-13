/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { bindActionCreators, compose } from 'redux';
import { get, isEmpty } from 'lodash';
import { Header } from '@buffetjs/custom';
import {
  auth,
  PopUpWarning,
  LoadingIndicatorPage,
  InputsIndex as Input,
  GlobalContext,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';

import Block from '../../components/Block';
import Row from '../../components/Row';

import openWithNewTab from '../../utils/openWithNewTab';
import { ContainerFluid, StyledRow, VersionWrapper } from './components';
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
import saga from './saga';

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
        color: 'none',
        label: this.context.formatMessage({
          id: getTrad('containers.HomePage.Button.open'),
        }),
        className: 'buttonOutline',
        onClick: this.openCurrentDocumentation,
        type: 'button',
        key: 'button-open',
      },
      {
        label: this.context.formatMessage({
          id: getTrad('containers.HomePage.Button.update'),
        }),
        color: 'success',
        onClick: () => {},
        type: 'submit',
        key: 'button-submit',
      },
    ];
  };

  handleCopy = () => {
    strapi.notification.info(getTrad('containers.HomePage.copied'));
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

  static contextType = GlobalContext;

  render() {
    const {
      docVersions,
      form,
      isLoading,
      onConfirmDeleteDoc,
      onSubmit,
      versionToDelete,
    } = this.props;
    const { formatMessage } = this.context;

    if (isLoading) {
      return <LoadingIndicatorPage />;
    }

    return (
      <ContainerFluid className="container-fluid">
        <PopUpWarning
          isOpen={!isEmpty(versionToDelete)}
          toggleModal={this.toggleModal}
          content={{
            title: 'components.popUpWarning.title',
            message: getTrad('containers.HomePage.PopUpWarning.message'),
            cancel: 'app.components.Button.cancel',
            confirm: getTrad('containers.HomePage.PopUpWarning.confirm'),
          }}
          popUpWarningType="danger"
          onConfirm={onConfirmDeleteDoc}
        />
        <form onSubmit={onSubmit}>
          <Header
            actions={this.getPluginHeaderActions()}
            title={{
              label: formatMessage({
                id: getTrad('containers.HomePage.PluginHeader.title'),
              }),
            }}
            content={formatMessage({
              id: getTrad('containers.HomePage.PluginHeader.description'),
            })}
          />
          <StyledRow className="row">
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
                    label={{ id: getTrad('containers.HomePage.form.jwtToken') }}
                    inputDescription={{
                      id: getTrad('containers.HomePage.form.jwtToken.description'),
                    }}
                  />
                </div>
              </CopyToClipboard>
            </Block>
            <Block>{form.map(this.renderForm)}</Block>
            <Block title={getTrad('containers.HomePage.Block.title')}>
              <VersionWrapper>
                <Row isHeader />
                {docVersions.map(this.renderRow)}
              </VersionWrapper>
            </Block>
          </StyledRow>
        </form>
      </ContainerFluid>
    );
  }
}

HomePage.defaultProps = {
  currentDocVersion: '',
  didCheckErrors: false,
  docVersions: [],
  form: [],
  formErrors: {},
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
  formErrors: PropTypes.object,
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
    dispatch
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withSaga = strapi.injectSaga({ key: 'homePage', saga, pluginId });

export default compose(withSaga, withConnect)(HomePage);
