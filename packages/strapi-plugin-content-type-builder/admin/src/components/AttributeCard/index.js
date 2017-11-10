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
/* eslint-disable jsx-a11y/no-autofocus */
const asset = {
  'boolean': IcoBoolean,
  'date': IcoDate,
  'media': IcoImage,
  'number': IcoNumber,
  'json': IcoJson,
  'relation': IcoRelation,
  'string': IcoString,
  'text': IcoText,
};

function AttributeCard({ attribute, autoFocus, handleClick, tabIndex }) {
  return (
    <div className="col-md-6">
      <button
        autoFocus={autoFocus}
        className={styles.attributeCardContainer}
        onClick={() => handleClick(attribute.type)}
        style={{ width: '100%' }}
        type="button"
        tabIndex={tabIndex + 1}
      >
        <div className={styles.attributeCard}>
          <img src={asset[attribute.type]} alt="ico" />
          <FormattedMessage id={`content-type-builder.popUpForm.attributes.${attribute.type}.name`}>
            {(message) => <span className={styles.attributeType}>{message}</span>}
          </FormattedMessage>
          <FormattedMessage id={attribute.description} />
        </div>
      </button>
    </div>
  );
}

AttributeCard.propTypes = {
  attribute: PropTypes.object.isRequired,
  autoFocus: PropTypes.bool.isRequired,
  handleClick: PropTypes.func.isRequired,
  tabIndex: PropTypes.number.isRequired,
};

export default AttributeCard;
