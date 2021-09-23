/**
 *
 * PluginHeaderTitle
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isFunction, isObject } from 'lodash';

import LoadingBar from '../LoadingBar';

import StyledPluginHeaderTitle from './StyledPluginHeaderTitle';

function PluginHeaderTitle({
  description,
  title,
  titleId,
  withDescriptionAnim,
  icon,
  onClickIcon,
}) {
  const contentTitle = formatData(title);
  const contentDescription = formatData(description);

  return (
    <StyledPluginHeaderTitle>
      <div className="header-title">
        <h1 id={titleId}>
          {contentTitle}
          {icon && <i className={`${icon}`} id="editCTName" onClick={onClickIcon} role="button" />}
        </h1>
      </div>
      {withDescriptionAnim ? (
        <LoadingBar style={{ marginTop: '13px' }} />
      ) : (
        <p className="header-subtitle">{contentDescription}&nbsp;</p>
      )}
    </StyledPluginHeaderTitle>
  );
}

const formatData = data => {
  if (isObject(data) && !isEmpty(data.id)) {
    return <FormattedMessage id={data.id} defaultMessage={data.id} values={data.values} />;
  }

  if (isFunction(data)) {
    return data();
  }

  return data;
};

PluginHeaderTitle.defaultProps = {
  description: '',
  icon: null,
  onClickIcon: () => {},
  title: '',
  titleId: '',
  withDescriptionAnim: false,
};

PluginHeaderTitle.propTypes = {
  description: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      values: PropTypes.object,
    }),
  ]),
  icon: PropTypes.string,
  onClickIcon: PropTypes.func,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      values: PropTypes.object,
    }),
  ]),
  titleId: PropTypes.string,
  withDescriptionAnim: PropTypes.bool,
};

export default memo(PluginHeaderTitle);
