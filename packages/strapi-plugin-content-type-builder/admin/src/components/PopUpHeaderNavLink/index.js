/**
*
* PopUpHeaderNavLink
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { replace, includes } from 'lodash';
import { router } from 'app';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */

class PopUpHeaderNavLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  goTo = () => {
    router.push(replace(this.props.routePath, this.props.nameToReplace, this.props.name));
  }

  render() {
    const activeClass = includes(this.props.routePath, this.props.name) ? styles.popUpHeaderNavLink : '';

    return (
      <div className={activeClass} onClick={this.goTo}>
        <FormattedMessage id={this.props.message} />
      </div>
    );
  }
}

PopUpHeaderNavLink.propTypes = {
  message: React.PropTypes.string,
  name: React.PropTypes.string,
  nameToReplace: React.PropTypes.string,
  routePath: React.PropTypes.string,
}

export default PopUpHeaderNavLink;
