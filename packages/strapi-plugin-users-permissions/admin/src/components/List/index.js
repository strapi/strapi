/**
*
* List
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { map, omitBy, size } from 'lodash';
import cn from 'classnames';

// Components from strapi-helper-plugin
import LoadingBar from 'components/LoadingBar';
import LoadingIndicator from 'components/LoadingIndicator';

// Design
import Button from 'components/Button';
import ListRow from 'components/ListRow';

import styles from './styles.scss';

const generateListTitle = (data, settingType) => {
  switch (settingType) {
    case 'roles': {
      const title = size(data) < 2 ?
        <FormattedMessage id="users-permissions.List.title.roles.singular" values={{ number: size(data) }} />
        : <FormattedMessage id="users-permissions.List.title.roles.plural" values={{ number: size(data) }} />;

      return title;
    }
    case 'providers': {
      const enabledProvidersSize = data.filter(o => o.enabled).length;

      const enabledProviders = enabledProvidersSize > 1 ?
        <FormattedMessage id="users-permissions.List.title.providers.enabled.plural" values={{ number: enabledProvidersSize }} />
        : <FormattedMessage id="users-permissions.List.title.providers.enabled.singular" values={{ number: enabledProvidersSize }} />;

      const disabledProviders = size(data) - enabledProvidersSize > 1 ?
        <FormattedMessage id="users-permissions.List.title.providers.disabled.plural" values={{ number: size(data) - enabledProvidersSize }} />
        : <FormattedMessage id="users-permissions.List.title.providers.disabled.plural" values={{ number: size(data) - enabledProvidersSize }} />;

      return <div>{enabledProviders}&nbsp;{disabledProviders}</div>;

    }
    case 'email-templates': {
      return size(data) > 1 ?
        <FormattedMessage id="users-permissions.List.title.emailTemplates.plural" values={{ number: size(data) }} />
        : <FormattedMessage id="users-permissions.List.title.emailTemplates.singular" values={{ number: size(data) }} />;
    }
    default:
      return '';
  }
};

function List({ data, deleteData, noButton, onButtonClick, settingType, showLoaders, values }) {
  const object = omitBy(data, (v) => v.name === 'server'); // Remove the server key when displaying providers

  return (
    <div className={styles.list}>
      <div className={styles.flex}>
        <div className={styles.titleContainer}>
          {showLoaders ? <LoadingBar style={{ marginTop: '0' }} /> : generateListTitle(data, settingType)}
        </div>
        <div className={styles.buttonContainer}>
          {noButton ? (
            ''
          ) : (
            <Button onClick={onButtonClick} secondaryHotlineAdd>
              <FormattedMessage id={`users-permissions.List.button.${settingType}`} />
            </Button>
          )}
        </div>
      </div>
      <div className={cn(styles.ulContainer, showLoaders && styles.loadingContainer, showLoaders && settingType === 'roles' && styles.loadingContainerRole )}>
        {showLoaders ? <LoadingIndicator /> : (
          <ul className={noButton ? styles.listPadded : ''}>
            {map(object, item => (
              <ListRow
                deleteData={deleteData}
                item={item}
                key={item.name}
                settingType={settingType}
                values={values}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

List.defaultProps = {
  noButton: false,
  onButtonClick: () => {},
  showLoaders: true,
};

List.propTypes = {
  data: PropTypes.array.isRequired,
  deleteData: PropTypes.func.isRequired,
  noButton: PropTypes.bool,
  onButtonClick: PropTypes.func,
  settingType: PropTypes.string.isRequired,
  showLoaders: PropTypes.bool,
  values: PropTypes.object.isRequired,
};

export default List;
