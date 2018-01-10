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
import IcoEmail from '../../assets/images/icon_email.png';
import IcoImage from '../../assets/images/icon_image.png';
import IcoJson from '../../assets/images/icon_json.png';
import IcoPassword from '../../assets/images/icon_password.png';
import IcoNumber from '../../assets/images/icon_number.png';
import IcoRelation from '../../assets/images/icon_relation.png';
import IcoString from '../../assets/images/icon_string.png';
import IcoText from '../../assets/images/icon_text.png';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
const asset = {
  'boolean': IcoBoolean,
  'date': IcoDate,
  'email': IcoEmail,
  'media': IcoImage,
  'number': IcoNumber,
  'json': IcoJson,
  'password': IcoPassword,
  'relation': IcoRelation,
  'string': IcoString,
  'text': IcoText,
};

function AttributeCard({ attribute, handleClick }) {
  return (
    <div className="col-md-6">
      <div className={styles.attributeCardContainer} onClick={() => handleClick(attribute.type)}>
        <div className={styles.attributeCard}>
          <img src={asset[attribute.type]} alt="ico" />
          <FormattedMessage id={`content-type-builder.popUpForm.attributes.${attribute.type}.name`}>
            {(message) => <span className={styles.attributeType}>{message}</span>}
          </FormattedMessage>
          <FormattedMessage id={attribute.description} />
        </div>
      </div>
    </div>
  );
}

AttributeCard.propTypes = {
  attribute: PropTypes.object.isRequired,
  handleClick: PropTypes.func.isRequired,
};

export default AttributeCard;
