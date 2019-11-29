/**
 *
 * InputFileDetails
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, startsWith } from 'lodash';
import EmptyWrapper from './EmptyWrapper';
import Wrapper from './Wrapper';

function InputFileDetails(props) {
  if (props.number === 0 && props.multiple) {
    return <EmptyWrapper />;
  }

  // TODO improve logic
  if (!get(props.file, 'name') && !props.multiple) {
    return <EmptyWrapper />;
  }

  const url = startsWith(props.file.url, '/')
    ? `${strapi.backendURL}${props.file.url}`
    : props.file.url;

  return (
    <Wrapper>
      <div className="detailBanner">
        <div>
          {props.file.url && (
            <a
              href={url}
              className="externalLink"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa fa-external-link-alt" />
              <FormattedMessage id="app.components.InputFileDetails.open" />
            </a>
          )}
        </div>
        <div className="removeContainer" onClick={props.onFileDelete}>
          <FormattedMessage id="app.components.InputFileDetails.remove" />
        </div>
      </div>
    </Wrapper>
  );
}

InputFileDetails.defaultProps = {
  file: {},
  multiple: false,
  number: 0,
  onFileDelete: () => {},
};

InputFileDetails.propTypes = {
  file: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  multiple: PropTypes.bool,
  number: PropTypes.number,
  onFileDelete: PropTypes.func,
};

export default InputFileDetails;
