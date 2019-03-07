/**
 *
 * ModelPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { get } from 'lodash';

import PluginHeader from 'components/PluginHeader';

import { routerPropTypes } from 'commonPropTypes';
import pluginId from '../../pluginId';

import LeftMenu from '../../components/LeftMenu';
import LeftMenuSection from '../../components/LeftMenuSection';
import LeftMenuSectionTitle from '../../components/LeftMenuSectionTitle';
import LeftMenuLink from '../../components/LeftMenuLink';

import CustomLink from './CustomLink';

import makeSelectModelPage from './selectors';
import reducer from './reducer';
import saga from './saga';
import styles from './styles.scss';
import DocumentationSection from './DocumentationSection';

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getModelDescription = () => {
    const { initialData } = this.props;
    
    const description = get(
      initialData,
      [this.getModelName(), 'description'],
      null,
    );

    // eslint-disable-next-line no-extra-boolean-cast
    return !!description ? description : { id: `${pluginId}.modelPage.contentHeader.emptyDescription.description` };
  }

  getModelName = () => {
    const { match: { params: { modelName } } } = this.props;

    return modelName.split('&')[0];
  }

  getModelNumber = () => {
    const { models } = this.props;

    return models.length;
  }

  getSectionTitle = () => {
    const base = `${pluginId}.menu.section.contentTypeBuilder.name.`;

    return this.getModelNumber() > 1 ? `${base}plural` : `${base}singular`;
  }

  handleClick = () => {}

  renderLinks = () => {
    const { models } = this.props;
    const links = models.map(model => {
      const { name, source } = model;
      const base = `/plugins/${pluginId}/models/${name}`;
      const to = source ? `${base}&source=${source}` : base;

      return (
        <LeftMenuLink
          key={name}
          icon="fa fa-caret-square-o-right"
          name={name}
          source={source}
          to={to}
        />
      );
    });

    return links;
  }

  render() {
    return (
      <div className={styles.modelpage}>
        <div className="container-fluid">
          <div className="row">
            <LeftMenu>
              <LeftMenuSection>
                <LeftMenuSectionTitle id={this.getSectionTitle()} />
                <ul>
                  {this.renderLinks()}
                  <CustomLink onClick={this.handleClick} />
                </ul>
              </LeftMenuSection>
              <LeftMenuSection>
                <LeftMenuSectionTitle id={`${pluginId}.menu.section.documentation.name`} />
                <DocumentationSection />
              </LeftMenuSection>
            </LeftMenu>

            <div className="col-md-9">
              <div className={styles.componentsContainer}>
                <PluginHeader
                  description={this.getModelDescription()}
                  title={this.getModelName()}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }
}

ModelPage.propTypes = {
  ...routerPropTypes(
    { params: PropTypes.string },
  ).isRequired,
  initialData: PropTypes.object.isRequired,
  models: PropTypes.array.isRequired,
};

const mapStateToProps = createStructuredSelector({
  modelpage: makeSelectModelPage(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = strapi.injectReducer({ key: 'modelPage', reducer, pluginId });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = strapi.injectSaga({ key: 'modelPage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ModelPage);
