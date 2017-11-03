/**
*
* EmptyAttributesView
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from 'components/Button';
import PluginHeader from 'components/PluginHeader';
import styles from './styles.scss';

function EmptyAttributesView({ currentModelName, history, modelEntries }) {
  return (
    <div className={styles.container}>
      <PluginHeader
        title={{
          id: currentModelName,
        }}
        description={{
          id: 'content-manager.containers.List.pluginHeaderDescription',
          values: {
            label: modelEntries,
          },
        }}
        actions={[]}
      />
      <div>
        <div className={styles.emptyAttributesView}>
          <div>
            <FormattedMessage id="content-manager.emptyAttributes.title">
              {(title) => <div className={styles.title}>{title}</div>}
            </FormattedMessage>
            <FormattedMessage id="content-manager.emptyAttributes.description">
              {(description) => <div className={styles.description}>{description}</div>}
            </FormattedMessage>
            <div className={styles.buttonContainer}>
              <Button
                onClick={() => history.push(`/plugins/content-type-builder/models/${currentModelName}#choose::attributes`)}
                primaryAddShape
                label={'content-manager.emptyAttributes.button'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

EmptyAttributesView.propTypes = {
  currentModelName: PropTypes.string.isRequired,
  history: PropTypes.object.isRequired,
  modelEntries: PropTypes.number.isRequired,
};

export default EmptyAttributesView;
