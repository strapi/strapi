/**
*
* PopUpHeaderNavLink
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class PopUpHeaderNavLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  goTo = () => {
    this.props.handleClick(this.props.name);
  }

  render() {
    const activeClass = this.props.showActiveClass ? styles.popUpHeaderNavLink : '';
    return (
      <div className={activeClass} onClick={this.goTo}>
        <FormattedMessage id={this.props.message} />
      </div>
    );
  }
}

PopUpHeaderNavLink.propTypes = {
  handleClick: React.PropTypes.func,
  message: React.PropTypes.string,
  name: React.PropTypes.string,
  showActiveClass: React.PropTypes.bool,
}

export default PopUpHeaderNavLink;
