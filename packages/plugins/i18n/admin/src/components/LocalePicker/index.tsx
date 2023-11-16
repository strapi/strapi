import { useState } from 'react';

import { Option, Select } from '@strapi/design-system';
import { useQueryParams } from '@strapi/helper-plugin';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';

import { useContentTypePermissions } from '../../hooks/useContentTypePermissions';
import useHasI18n from '../../hooks/useHasI18n';
import { useTypedSelector } from '../../store/hooks';
import getInitialLocale from '../../utils/getInitialLocale';
import { getTranslation } from '../../utils/getTranslation';

const LocalePicker = () => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const locales = useTypedSelector((state) => state.i18n_locales.locales);
  const [{ query }, setQuery] = useQueryParams<any>();
  const {
    params: { slug },
  } = useRouteMatch('/content-manager/collectionType/:slug') as any;
  const isFieldLocalized = useHasI18n();
  const { createPermissions, readPermissions } = useContentTypePermissions(slug);

  const initialLocale = getInitialLocale(query, locales);
  const [selected, setSelected] = useState(initialLocale?.code || '');

  if (!isFieldLocalized) {
    return null;
  }

  if (!locales || locales.length === 0) {
    return null;
  }

  const displayedLocales = locales.filter((locale: any) => {
    const canCreate = createPermissions.find(({ properties }: any) => {
      return get(properties, 'locales', []).includes(locale.code);
    });
    const canRead = readPermissions.find(({ properties }: any) =>
      get(properties, 'locales', []).includes(locale.code)
    );

    return canCreate || canRead;
  });

  const handleClick = (code: string) => {
    if (code === selected) {
      return;
    }

    setSelected(code);

    /**
     * if the selected value is set at the same time as the dispatcher
     * is run, react might not have enough time to re-render the Select
     * component, which leads to the `source` ref, which is passed to
     * Popout, not being defined.
     *
     * By pushing the dispatcher to the end of the current execution
     * context, we can guarantee the rendering can finish before.
     */
    setTimeout(() => {
      dispatch({ type: 'ContentManager/RBACManager/RESET_PERMISSIONS' });
      setQuery({
        page: 1,
        plugins: { ...query.plugins, i18n: { locale: code } },
      });
    });
  };

  return (
    <Select
      size="S"
      aria-label={formatMessage({
        id: getTranslation('actions.select-locale'),
        defaultMessage: '',
      })}
      value={selected}
      onChange={handleClick as any}
    >
      {displayedLocales.map((locale) => (
        <Option key={locale.id} id={`menu-item${locale.name || locale.code}`} value={locale.code}>
          {locale.name}
        </Option>
      ))}
    </Select>
  );
};

export default LocalePicker;
