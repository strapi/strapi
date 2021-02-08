import React from 'react';
import { useIntl } from 'react-intl';
import { EmptyState, ListButton } from 'strapi-helper-plugin';
import { List, Button } from '@buffetjs/custom';
import { Plus } from '@buffetjs/icons';
import PropTypes from 'prop-types';
import { useLocales } from '../../hooks';
import LocaleRow from '../LocaleRow';
import { getTrad } from '../../utils';

const LocaleList = ({ onAddLocale, onDeleteLocale, onEditLocale }) => {
  const { locales, isLoading } = useLocales();
  const { formatMessage } = useIntl();

  if (isLoading || (locales && locales.length > 0)) {
    const listTitle = isLoading
      ? null
      : formatMessage(
          {
            id: getTrad(
              `Settings.locales.list.title${locales.length > 1 ? '.plural' : '.singular'}`
            ),
          },
          { number: locales.length }
        );

    return (
      <List
        title={listTitle}
        items={locales}
        isLoading={isLoading}
        customRowComponent={locale => (
          <LocaleRow locale={locale} onDelete={onDeleteLocale} onEdit={onEditLocale} />
        )}
      />
    );
  }

  return (
    <>
      <EmptyState
        title={formatMessage({ id: getTrad('Settings.list.empty.title') })}
        description={formatMessage({ id: getTrad('Settings.list.empty.description') })}
      />
      {onAddLocale && (
        <ListButton>
          <Button
            label={formatMessage({ id: getTrad('Settings.list.actions.add') })}
            onClick={onAddLocale}
            color="primary"
            type="button"
            icon={<Plus fill="#007eff" width="11px" height="11px" />}
          />
        </ListButton>
      )}
    </>
  );
};

LocaleList.defaultProps = {
  onAddLocale: undefined,
  onDeleteLocale: undefined,
  onEditLocale: undefined,
};

LocaleList.propTypes = {
  onAddLocale: PropTypes.func,
  onDeleteLocale: PropTypes.func,
  onEditLocale: PropTypes.func,
};

export default LocaleList;
