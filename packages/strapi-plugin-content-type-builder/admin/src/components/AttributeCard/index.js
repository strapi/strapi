/**
*
* AttributeCard
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';

import IcoBoolean from '../../assets/images/icon_boolean.svg';
import IcoDate from '../../assets/images/icon_date.svg';
import IcoImage from '../../assets/images/icon_image.svg';
import IcoJson from '../../assets/images/icon_json.svg';
import IcoNumber from '../../assets/images/icon_number.svg';
import IcoRelation from '../../assets/images/icon_relation.svg';
import IcoString from '../../assets/images/icon_string.svg';
import IcoText from '../../assets/images/icon_text.svg';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */

class AttributeCard extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.asset = {
      'boolean': IcoBoolean,
      'date': IcoDate,
      'media': IcoImage,
      'number': IcoNumber,
      'json': IcoJson,
      'relation': IcoRelation,
      'string': IcoString,
      'text': IcoText,
    };
  }

  goTo = () => {
    this.props.handleClick(this.props.attribute.type);
  }

  render() {
    return (
      <div className="col-md-6">
        <div className={styles.attributeCardContainer} onClick={this.goTo}>
          <div className={styles.attributeCard}>
            <img src={this.asset[this.props.attribute.type]} role="presentation" />
            <FormattedMessage id={`popUpForm.attributes.${this.props.attribute.type}.name`}>
              {(message) => <span className={styles.attributeType}>{message}</span>}
            </FormattedMessage>
            <FormattedMessage id={this.props.attribute.description} />
          </div>
          <div className={styles.checkContainer}>
            <i className="fa fa-check" />
          </div>
        </div>
      </div>
    );
  }
}

AttributeCard.propTypes = {
  attribute: React.PropTypes.object.isRequired,
  handleClick: React.PropTypes.func,
}

export default AttributeCard;
