/**
 *
 * InputFileDetails
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { isEmpty, get } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

function InputFileDetails(props) {
  if (props.number === 0 && props.multiple) {
    return <div />;
  }

  // TODO improve logic
  if (!get(props.file, 'name') && !props.multiple) {
    return <div />
  }

  return (
    <div className={styles.inputFileDetails}>
      <div className={styles.detailBanner} onClick={props.onClick}>
        <div>
          <div className={cn(props.isOpen && styles.chevronDown, !props.isOpen && styles.chevronRight)} />
          <div>
            <FormattedMessage id="app.components.InputFileDetails.details" />
          </div>
          <div className={styles.positionContainer}>
            <span>{props.multiple ? props.position + 1 : 1}</span>
            <span>/{props.multiple ? props.number : 1}</span>
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
            <span>{props.file.size}</span>
          </div>
        </div>
      </Collapse>
    </div>
  );
}

InputFileDetails.defaultProps = {
  isOpen: false,
  multiple: false,
  number: 0,
  position: 0,
};

InputFileDetails.propTypes = {
  isOpen: PropTypes.bool,
  multiple: PropTypes.bool,
  number: PropTypes.number,
  position: PropTypes.number,
};

export default InputFileDetails;
