/*
 *
 *
 * ListPlugins
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { map, size } from 'lodash';

// Design
import { Button } from 'strapi-helper-plugin';
import Row from '../Row';
import Wrapper from './Wrapper';

/* eslint-disable react/prefer-stateless-function */

class ListPlugins extends React.Component {
  render() {
    const listSize = size(this.props.plugins);
    let titleType = listSize === 1 ? 'singular' : 'plural';

    if (listSize === 0) {
      titleType = 'none';
    }

    return (
      <Wrapper>
        <div className="titleContainer">
          <div>
            <FormattedMessage
              id={`app.components.listPlugins.title.${titleType}`}
              values={{ number: listSize }}
            />
          </div>
          <div>
            <Button
              label="app.components.listPlugins.button"
              onClick={() => this.props.history.push('/install-plugin')}
              secondaryHotlineAdd
              style={{ display: 'none' }}
            />
          </div>
        </div>
        <div className="container-fluid">
          <div className="row">
            <div className="ulContainer">
              <ul>
                {map(this.props.plugins, (plugin, key) => (
                  <Row
                    name={key}
                    key={plugin.name}
                    plugin={plugin}
                    onDeleteClick={this.props.onDeleteClick}
                    pluginActionSucceeded={this.props.pluginActionSucceeded}
                    onDeleteConfirm={this.props.onDeleteConfirm}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }
}

ListPlugins.propTypes = {
  history: PropTypes.object.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onDeleteConfirm: PropTypes.func.isRequired,
  pluginActionSucceeded: PropTypes.bool.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default ListPlugins;
