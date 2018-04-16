/**
 *
 * InputFileDetails
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, startsWith } from 'lodash';

import styles from './styles.scss';

function InputFileDetails(props) {
  if (props.number === 0 && props.multiple) {
    return <div className={styles.inputFileDetailsEmpty} />;
  }

  // TODO improve logic
  if (!get(props.file, 'name') && !props.multiple) {
    return <div className={styles.inputFileDetailsEmpty} />;
  }

  const url = startsWith(props.file.url, '/') ? `${strapi.backendURL}${props.file.url}` : props.file.url;

  return (
    <div className={styles.inputFileDetails}>
      <div className={styles.detailBanner}>
        <div>
          {props.file.url && (
            <a href={url} className={styles.externalLink} target="_blank">
              <i className="fa fa-external-link-square" />
              <FormattedMessage id="app.components.InputFileDetails.open" />
            </a>
          )}
        </div>
        <div className={styles.removeContainer} onClick={props.onFileDelete}>
          <FormattedMessage id="app.components.InputFileDetails.remove" />
        </div>
      </div>
    </div>
  );
}

InputFileDetails.defaultProps = {
  file: {},
  multiple: false,
  number: 0,
  onFileDelete: () => {},
};

InputFileDetails.propTypes = {
  file: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]),
  multiple: PropTypes.bool,
  number: PropTypes.number,
  onFileDelete: PropTypes.func,
};

export default InputFileDetails;
