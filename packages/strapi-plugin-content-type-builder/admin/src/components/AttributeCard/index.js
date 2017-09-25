/**
*
* AttributeCard
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import IcoBoolean from '../../assets/images/icon_boolean.png';
import IcoDate from '../../assets/images/icon_date.png';
import IcoImage from '../../assets/images/icon_image.png';
import IcoJson from '../../assets/images/icon_json.png';
import IcoNumber from '../../assets/images/icon_number.png';
import IcoRelation from '../../assets/images/icon_relation.png';
import IcoString from '../../assets/images/icon_string.png';
import IcoText from '../../assets/images/icon_text.png';

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
    const bootstrapClass = this.props.attribute.type === 'relation' ? 'col-md-6 offset-md-3' : 'col-md-6';
    return (
      <div className={bootstrapClass}>
        <div className={styles.attributeCardContainer} onClick={this.goTo}>
          <div className={styles.attributeCard}>
            <img src={this.asset[this.props.attribute.type]} alt="ico" />
            <FormattedMessage id={`content-type-builder.popUpForm.attributes.${this.props.attribute.type}.name`}>
              {(message) => <span className={styles.attributeType}>{message}</span>}
            </FormattedMessage>
            <FormattedMessage id={this.props.attribute.description} />
          </div>
        </div>
      </div>
    );
  }
}

AttributeCard.propTypes = {
  attribute: PropTypes.object.isRequired,
  handleClick: PropTypes.func,
}

export default AttributeCard;
