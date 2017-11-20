/**
*
* List
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { map, size } from 'lodash';

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

function List({ data, deleteActionSucceeded, deleteData, noButton, onButtonClick, settingType }) {
  return (
    <div className={styles.list}>
      <div className={styles.flex}>
        <div className={styles.titleContainer}>
          {generateListTitle(data, settingType)}
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
      <div className={styles.ulContainer}>
        <ul className={noButton ? styles.listPadded : ''}>
          {map(data, item => (
            <ListRow
              deleteActionSucceeded={deleteActionSucceeded}
              deleteData={deleteData}
              item={item}
              key={item.name}
              settingType={settingType}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

List.defaultProps = {
  noButton: false,
  onButtonClick: () => {},
};

List.propTypes = {
  data: PropTypes.array.isRequired,
  deleteActionSucceeded: PropTypes.bool.isRequired,
  deleteData: PropTypes.func.isRequired,
  noButton: PropTypes.bool,
  onButtonClick: PropTypes.func,
  settingType: PropTypes.string.isRequired,
};

export default List;
