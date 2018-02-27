/**
 *
 * InputFileDetails
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

function InputFileDetails(props) {
  if (props.number === 0) {
    return <div />;
  }

  return (
    <div className={styles.inputFileDetails}>
      <div className={styles.detailBanner} onClick={props.onClick}>
        <div>
          <div className={cn(props.isOpen && styles.chevronDown, !props.isOpen && styles.chevronUp)} />
          <div>
            <FormattedMessage id="app.components.InputFileDetails.details" />
          </div>
          <div className={styles.positionContainer}>
            <span>{props.position + 1}</span>
            <span>/{props.number}</span>
          </div>
        </div>
        <div className={styles.removeContainer} onClick={props.onFileDelete}>
          <FormattedMessage id="app.components.InputFileDetails.remove" />
        </div>
      </div>
      <Collapse isOpen={props.isOpen}>
        <div className={styles.infoContainer}>

          <div className={styles.infoWrapper}>
            <FormattedMessage id="app.components.InputFileDetails.originalName" />&nbsp;
            <span>{props.file.name}</span>
          </div>
          <div className={styles.infoWrapper}>
            <FormattedMessage id="app.components.InputFileDetails.size" />&nbsp;
            <span>{props.file.name}</span>
          </div>
        </div>
      </Collapse>
    </div>
  );
}

InputFileDetails.defaultProps = {
  isOpen: false,
  number: 0,
  position: 0,
};

InputFileDetails.propTypes = {
  isOpen: PropTypes.bool,
  number: PropTypes.number,
  position: PropTypes.number,
};

export default InputFileDetails;
