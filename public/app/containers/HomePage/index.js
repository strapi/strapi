/*
 * HomePage
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import PluginHeader from 'components/PluginHeader';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';
import RightContentSectionTitle from 'components/RightContentSectionTitle';
import { injectIntl, intlShape, FormattedMessage } from 'react-intl';

import appMessages from 'containers/App/messages.json';
import messages from './messages.json';
import { define } from '../../i18n';
define(messages);

import {
  // selectHome,
  selectLoading,
  selectError,
  // selectGeneralSettings,
  selectName,
  selectDescription,
  selectVersion,
  // selectLocationState,
} from './selectors';

import {
  loadGeneralSettings,
  changeName,
  changeDescription,
  changeVersion,
  updateGeneralSettings,
  cancelGeneralSettings,
} from './actions';


import styles from './styles.scss';

export class HomePage extends React.Component {

  componentDidMount() {
    this.props.onPageLoad();
  }

  render() {
    const { formatMessage } = this.props.intl;

    return (
      <div>
        <div className="container">
          <PluginHeader {...this.props}></PluginHeader>
          <Container>
            <RightContentTitle
              title={formatMessage(appMessages.generalSectionTitle)}
              description={formatMessage(messages.rightSectionDescription)}
            />
            <RightContentSectionTitle
              title={formatMessage(messages.rightContentSectionTitle)}
              description={formatMessage(messages.rightContentSectionDescription)}
            />
            <form onSubmit={this.props.onFormSubmit}>
              <div className={`form-group row ${styles.homePageRightContentFormGroup}`}>
                <label htmlFor="applicationName" className="col-xs-7 col-form-label">
                  <FormattedMessage {...messages.nameLabel} />
                </label>
                <div className="col-xs-5">
                  <input
                    className="form-control"
                    type="text"
                    placeholder={formatMessage(messages.namePlaceholder)}
                    id="applicationName"
                    value={this.props.name || ''}
                    onChange={this.props.onChangeName}
                    autoFocus
                  />
                </div>
              </div>
              <div className={`form-group row ${styles.homePageRightContentFormGroup}`}>
                <label htmlFor="applicationDescription" className="col-xs-7 col-form-label">
                  <FormattedMessage {...messages.descriptionLabel} />
                </label>
                <div className="col-xs-5">
                  <input
                    className="form-control"
                    type="text"
                    placeholder={formatMessage(messages.descriptionPlaceholder)}
                    id="applicationDescription"
                    value={this.props.description || ''}
                    onChange={this.props.onChangeDescription}
                  />
                </div>
              </div>
              <div className={`form-group row ${styles.homePageRightContentFormGroup}`}>
                <label htmlFor="applicationVersion" className="col-xs-7 col-form-label">
                  <FormattedMessage {...messages.versionLabel} />
                </label>
                <div className="col-xs-5">
                  <input
                    className="form-control"
                    type="text"
                    placeholder={formatMessage(messages.versionPlaceholder)}
                    id="applicationVersion"
                    value={this.props.version || ''}
                    onChange={this.props.onChangeVersion}
                  />
                </div>
              </div>
              <button className="btn btn-primary hidden-xs-up" type="submit">Submit</button>
            </form>
          </Container>
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {
  // changeRoute: React.PropTypes.func,
  description: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.bool,
  ]),
  // error: React.PropTypes.oneOfType([
  //   React.PropTypes.object,
  //   React.PropTypes.bool,
  // ]),
  intl: intlShape.isRequired,
  // loading: React.PropTypes.bool,
  name: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.bool,
  ]),
  // onCancel: React.PropTypes.func,
  onChangeName: React.PropTypes.func,
  onChangeDescription: React.PropTypes.func,
  onChangeVersion: React.PropTypes.func,
  onFormSubmit: React.PropTypes.func,
  onPageLoad: React.PropTypes.func,
  version: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.bool,
  ]),
};

export function mapDispatchToProps(dispatch) {
  return {
    onCancel: () => dispatch(cancelGeneralSettings()),
    onChangeName: (evt) => dispatch(changeName(evt.target.value)),
    onChangeDescription: (evt) => dispatch(changeDescription(evt.target.value)),
    onChangeVersion: (evt) => dispatch(changeVersion(evt.target.value)),
    onFormSubmit: (evt) => {
      if (evt !== undefined && evt.preventDefault) evt.preventDefault();
      dispatch(updateGeneralSettings());
    },
    onPageLoad: (evt) => {
      if (evt !== undefined && evt.preventDefault) evt.preventDefault();
      dispatch(loadGeneralSettings());
    },
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  name: selectName(),
  description: selectDescription(),
  error: selectError(),
  loading: selectLoading(),
  version: selectVersion(),
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(HomePage));
