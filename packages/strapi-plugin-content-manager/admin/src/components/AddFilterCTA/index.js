/**
 *
 * AddFilterCTA
 *
 */ 

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

// Design
import Button from 'components/CustomButton';
import Logo from '../../assets/images/icon_filter.png';

import styles from './styles.scss';

class AddFilterCTA extends React.Component {
  state = { imgLoaded: false };

  handleImgLoaded = () => this.setState({ imgLoaded: true });

  render() {
    const { onClick, showHideText } = this.props;
    const { imgLoaded } = this.state;
    const id = showHideText ? 'hide' : 'add';
    
    return (
      <Button type="button" onClick={onClick} marginTop>
        <div className={styles.ctaWrapper}>
          {!imgLoaded && <div className={styles.spinner}><div /></div>}
          <img src={Logo} onLoad={this.handleImgLoaded} alt="filter_logo" className={styles.imgCta} />
          <FormattedMessage id={`content-manager.components.AddFilterCTA.${id}`} /> 

        </div>
      </Button>
    );
  }
}

AddFilterCTA.defaultProps = {
  onClick: () => {},
  showHideText: false,
};

AddFilterCTA.propTypes = {
  onClick: PropTypes.func,
  showHideText: PropTypes.bool,
};

export default AddFilterCTA;
