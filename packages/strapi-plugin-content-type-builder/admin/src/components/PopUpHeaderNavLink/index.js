/**
*
* PopUpHeaderNavLink
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { replace, includes } from 'lodash';
import { router } from 'app';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */

class PopUpHeaderNavLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleGoTo = () => {
    if (this.props.routePath.indexOf('#create::contentType') !== -1 && this.props.name === 'advancedSettings') {
      this.context.emitEvent('didSelectContentTypeSettings');
    } else if (this.props.routePath.indexOf('#create') !== -1 && this.props.routePath.indexOf('::attribute') !== -1 && this.props.name === 'advancedSettings') {
      this.context.emitEvent('didSelectContentTypeFieldSettings');
    }

    router.push(replace(this.props.routePath, this.props.nameToReplace, this.props.name));
  }

  render() {
    const activeClass = includes(this.props.routePath, this.props.name) ? styles.popUpHeaderNavLink : '';

    return (
      <div className={activeClass} onClick={this.handleGoTo} style={{ cursor: 'pointer' }}>
        <FormattedMessage id={this.props.message} />
      </div>
    );
  }
}

PopUpHeaderNavLink.contextTypes = {
  emitEvent: PropTypes.func,
};

PopUpHeaderNavLink.propTypes = {
  message: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  nameToReplace: PropTypes.string.isRequired,
  routePath: PropTypes.string.isRequired,
};

export default PopUpHeaderNavLink;
