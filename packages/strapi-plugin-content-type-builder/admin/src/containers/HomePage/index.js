/*
 *
 * HomePage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createStructuredSelector } from 'reselect';
import { size } from 'lodash';
import Helmet from 'react-helmet';
import { makeSelectLoading, makeSelectModels } from 'containers/App/selectors';

import Form from 'containers/Form';

// Design
import ContentHeader from 'components/ContentHeader';
import EmptyContentTypeView from 'components/EmptyContentTypeView';
import TableList from 'components/TableList';

import selectHomePage from './selectors';
import styles from './styles.scss';

export class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      showModal: false,
    };
  }

  toggleModal = () => this.setState({ showModal: !this.state.showModal });

  renderTableListComponent = () => {
    const availableNumber = size(this.props.models);
    const title = availableNumber > 1 ? 'table.contentType.title.plural'
      : 'table.contentType.title.singular';
    return (
      <TableList
        availableNumber={availableNumber}
        title={title}
        buttonLabel={'button.contentType.add'}
        handleButtonClick={this.toggleModal}
        rowItems={this.props.models}
      />
    );
  }


  render() {
    if (this.props.modelsLoading) return <div />;

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
          name={'home.contentTypeBuilder.name'}
          description={'home.contentTypeBuilder.description'}
          noMargin
        />
        {component}
        <Form
          isOpen={this.state.showModal}
          toggle={this.toggleModal}
          popUpFormType={'contentType'}
        />
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  homePage: selectHomePage(),
  modelsLoading: makeSelectLoading(),
  models: makeSelectModels(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
};

HomePage.propTypes =  {
  // homePage: React.PropTypes.object.isRequired,
  models: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.array,
  ]),
  modelsLoading: React.PropTypes.bool,
};

export default connect(mapStateToProps, mapDispatchToProps)(HomePage);
