/*
 *
 * HomePage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import { clone, includes, size } from 'lodash';
import Helmet from 'react-helmet';
import PropTypes from 'prop-types';
import { router } from 'app';

import { makeSelectLoading, makeSelectMenu, makeSelectModels } from 'containers/App/selectors';
import { deleteContentType } from 'containers/App/actions';

import Form from 'containers/Form';

// Design
import ContentHeader from 'components/ContentHeader';
import EmptyContentTypeView from 'components/EmptyContentTypeView';
import TableList from 'components/TableList';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import { storeData } from '../../utils/storeData';

import selectHomePage from './selectors';
import styles from './styles.scss';
import saga from './sagas';
import reducer from './reducer';

const keyBoardShortCuts = [18, 78];

export class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      mapKeys: {},
    };

    this.popUpHeaderNavLinks = [
      { name: 'baseSettings', message: 'content-type-builder.popUpForm.navContainer.base', nameToReplace: 'advancedSettings' },
      { name: 'advancedSettings', message: 'content-type-builder.popUpForm.navContainer.advanced', nameToReplace: 'baseSettings' },
    ];
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleShortCut);
    document.addEventListener('keyup', this.handleShortCut);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleShortCut);
    document.removeEventListener('keyup', this.handleShortCut);
  }

  handleButtonClick = () => {
    if (storeData.getIsModelTemporary()) {
      window.Strapi.notification.info('content-type-builder.notification.info.contentType.creating.notSaved');
    } else {
      this.toggleModal();
    }
  }

  handleDelete = (contentTypeName) => {
    this.props.deleteContentType(contentTypeName, this.context);
  }

  handleShortCut = (e) => {
    if (includes(keyBoardShortCuts, e.keyCode)) {
      const mapKeys = clone(this.state.mapKeys);
      mapKeys[e.keyCode] = e.type === 'keydown';
      this.setState({ mapKeys });

      // Check if user pressed option + n;
      if (mapKeys[18] && mapKeys[78]) {
        this.setState({ mapKey: {} });
        this.handleButtonClick();
      }
    }
  }

  toggleModal = () => {
    const locationHash = this.props.location.hash ? '' : '#create::contentType::baseSettings';
    router.push(`/plugins/content-type-builder/${locationHash}`);
  }

  renderTableListComponent = () => {
    const availableNumber = size(this.props.models);
    const title = availableNumber > 1 ? 'content-type-builder.table.contentType.title.plural'
      : 'content-type-builder.table.contentType.title.singular';
    return (
      <TableList
        availableNumber={availableNumber}
        title={title}
        buttonLabel={'content-type-builder.button.contentType.add'}
        onButtonClick={this.handleButtonClick}
        rowItems={this.props.models}
        onHandleDelete={this.handleDelete}
      />
    );
  }

  render() {
    const component = size(this.props.models) === 0 ?
      <EmptyContentTypeView handleButtonClick={this.toggleModal} />
      : this.renderTableListComponent();

    return (
      <div className={styles.homePage}>
        <Helmet
          title="HomePage"
          meta={[
            { name: 'description', content: 'Description of HomePage' },
          ]}
        />
        <ContentHeader
          name={'content-type-builder.home.contentTypeBuilder.name'}
          description={'content-type-builder.home.contentTypeBuilder.description'}
          styles={{ margin: '-1px 0 3rem 0'}}
        />
        {component}
        <Form
          hash={this.props.location.hash}
          toggle={this.toggleModal}
          routePath={this.props.match.path}
          popUpHeaderNavLinks={this.popUpHeaderNavLinks}
          menuData={this.props.menu}
          redirectRoute={`${this.props.match.path}`}
        />
      </div>
    );
  }
}

HomePage.contextTypes = {
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

HomePage.propTypes =  {
  deleteContentType: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  menu: PropTypes.array.isRequired,
  models: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]).isRequired,
};

const mapStateToProps = createStructuredSelector({
  homePage: selectHomePage(),
  modelsLoading: makeSelectLoading(),
  models: makeSelectModels(),
  menu: makeSelectMenu(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      deleteContentType,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(HomePage);
