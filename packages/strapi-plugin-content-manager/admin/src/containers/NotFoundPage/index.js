/**
 * NotFoundPage
 *
 * This is the page we show when the user visits a url that doesn't have a route
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

export default class NotFound extends React.Component {
  render() {
    return (
      <div>
        <div className="container">
          <h1>
            <FormattedMessage id="pageNotFound" />
          </h1>
        </div>
      </div>
    );
  }
}
