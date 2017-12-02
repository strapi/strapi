/**
*
* PluginCard
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { isEmpty, map, times } from 'lodash';
import { FormattedMessage } from 'react-intl';

// Temporary picture
import Button from 'components/Button';
import FakeScreenShot from './screenshot.png';
import styles from './styles.scss';

class PluginCard extends React.Component {
  state = { isOpen: false };

  componentDidMount() {
    this.shouldOpenModal(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.history.location.hash !== this.props.history.location.hash) {
      this.shouldOpenModal(nextProps);
    }
  }

  shouldOpenModal = (props) => {
    this.setState({ isOpen: !isEmpty(props.history.location.hash) });
  }

  render() {
    const stars = Math.round(this.props.plugin.ratings);
    const coloredStars = times(stars, String);
    const emptyStars = times(5 - stars, String);
    const buttonClass = !this.props.isAlreadyInstalled || this.props.showSupportUsButton ? styles.primary : styles.secondary;

    let buttonLabel = this.props.isAlreadyInstalled ? 'app.components.PluginCard.Button.label.install' : 'app.components.PluginCard.Button.label.download';

    if (this.props.showSupportUsButton) {
      buttonLabel = 'app.components.PluginCard.Button.label.support';
    }

    return (
      <div className={cn('col-md-4', styles.pluginCard)}>
        <div className={styles.wrapper}>
          <div className={styles.cardTitle}>
            <div><i className={`fa fa-${this.props.plugin.icon}`} /></div>
            <div>{this.props.plugin.name}</div>
          </div>
          <div className={styles.cardDescription}>
            <FormattedMessage id={this.props.plugin.description} />
          </div>
          <div className={styles.cardScreenshot}>
            <img src={FakeScreenShot} alt='plugin screenshot' />
          </div>
          <div className={styles.cardPrice}>
            <div>
              <i className={`fa fa-${this.props.plugin.isCompatible ? 'check' : 'times'}`} />
              <FormattedMessage id={`app.components.PluginCard.compatible${this.props.plugin.id === 'support-us' ? 'Community' : ''}`} />
            </div>
            <div>{this.props.plugin.price !== 0 ? `${this.props.plugin.price}€` : <FormattedMessage id="app.components.PluginCard.price.free" />}</div>
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.ratings}>
              <div className={styles.starsContainer}>
                <div>
                  {map(coloredStars, star => <i key={star} className=" fa fa-star" />)}
                </div>
                <div>
                  {map(emptyStars, s => <i key={s} className="fa fa-star" />)}
                </div>
              </div>
              <div>
                <span style={{ fontWeight: '600', color: '#333740' }}>{this.props.plugin.ratings}</span>
                <span style={{ fontWeight: '500', color: '#666666' }}>/5</span>
              </div>
            </div>
            <div>
              <Button
                className={cn(buttonClass, styles.button)}
                label={buttonLabel}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

PluginCard.defaultProps = {
  isAlreadyInstalled: false,
  plugin: {
    description: '',
    id: '',
    icon: '',
    name: '',
    price: 0,
    ratings: 5,
  },
  showSupportUsButton: false,
};

PluginCard.propTypes = {
  history: PropTypes.object.isRequired,
  isAlreadyInstalled: PropTypes.bool,
  plugin: PropTypes.object,
  showSupportUsButton: PropTypes.bool,
};

export default PluginCard;
