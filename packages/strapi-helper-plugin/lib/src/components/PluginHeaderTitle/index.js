/**
 *
 * PluginHeaderTitle
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isFunction, isObject } from 'lodash';

import LoadingBar from 'components/LoadingBar';

import styles from './styles.scss';

function PluginHeaderTitle({ description, title, titleId, withDescriptionAnim }) {
  const contentTitle = formatData(title);
  const contentDescription = formatData(description);

  return (
    <div>
      <h1 className={styles.pluginHeaderTitleName} id={titleId}>
        {contentTitle}&nbsp;
      </h1>
      {withDescriptionAnim ? (
        <LoadingBar />
      ) : (
        <p className={styles.pluginHeaderTitleDescription}>{contentDescription}&nbsp;</p>
      )}
    </div>
  );
}

const formatData = data => {
  
  if (isObject(data)) {
    return isEmpty(data.id) ? null : <FormattedMessage id={data.id} defaultMessage={data.id} values={data.values} />;
  }

  if (isFunction(data)) {
    return data();
  }

  return data;
};

PluginHeaderTitle.defaultProps = {
  description: '',
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

export default PluginHeaderTitle;
