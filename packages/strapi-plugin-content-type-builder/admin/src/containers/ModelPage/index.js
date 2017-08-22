/*
 *
 * ModelPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators } from 'redux';
import { size } from 'lodash';

// Global selectors
import { makeSelectMenu } from 'containers/App/selectors';

import ContentHeader from 'components/ContentHeader';
import EmptyAttributesView from 'components/EmptyAttributesView';
import List from 'components/List';
import PluginLeftMenu from 'components/PluginLeftMenu';

import { modelFetch } from './actions';

import selectModelPage from './selectors';
import styles from './styles.scss';

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.modelFetch(this.props.params.modelName);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.params.modelName !== this.props.params.modelName) {
      this.props.modelFetch(this.props.params.modelName);
    }
  }

  handleClick = () => {
    console.log('click');
  }

  render() {
    const content = size(this.props.modelPage.model.attributes) === 0 ?
      <EmptyAttributesView handleClick={this.handleClick} /> :
        <List model={this.props.modelPage.model} />;
        
    return (
      <div className={styles.modelPage}>
        <div className="container-fluid">
          <div className="row">
            <PluginLeftMenu
              sections={this.props.menu}
            />
            <div className="col-md-9">
              <div className={styles.componentsContainer}>
                <ContentHeader
                  name={this.props.modelPage.model.name}
                  description={this.props.modelPage.model.description}
                  noI18n
                  editIcon
                />
                {content}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  modelPage: selectModelPage(),
  menu: makeSelectMenu(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      modelFetch,
    },
    dispatch,
  );
}

ModelPage.propTypes = {
  menu: React.PropTypes.array,
  modelFetch: React.PropTypes.func,
  modelPage: React.PropTypes.object,
  params: React.PropTypes.object,
};

export default connect(mapStateToProps, mapDispatchToProps)(ModelPage);
