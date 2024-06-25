import { Box, Divider, Flex, Typography } from '@strapi/design-system';
import { useCMEditViewDataManager, useQueryParams } from '@strapi/helper-plugin';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { useContentTypePermissions } from '../hooks/useContentTypePermissions';
import { useTypedSelector } from '../store/hooks';
import { getLocalizationsFromData } from '../utils/data';
import { getTranslation } from '../utils/getTranslation';

import { CMEditViewCopyLocale } from './CMEditViewCopyLocale';
import { CMEditViewLocalePicker } from './CMEditViewLocalePicker';

import type { I18nBaseQuery } from '../types';

const CMEditViewInjectedComponents = () => {
  const { layout, modifiedData, slug } = useCMEditViewDataManager();
  const { createPermissions, readPermissions } = useContentTypePermissions(slug!);
  const locales = useTypedSelector((state) => state.i18n_locales.locales);
  const params = useParams<{ id: string }>();
  const [{ query }] = useQueryParams<I18nBaseQuery>();
  const { formatMessage } = useIntl();

  const currentEntityId = params.id ?? null;
  const defaultLocale = locales.find((loc) => loc.isDefault); // we always have a default locale;
  const currentLocale = get(query, 'plugins.i18n.locale', defaultLocale?.code);
  const hasI18nEnabled = get(layout, ['pluginOptions', 'i18n', 'localized'], false);

  if (!hasI18nEnabled) {
    return null;
  }

  if (!currentLocale) {
    return null;
  }

  const localizations = [
    ...getLocalizationsFromData(modifiedData),
    // current locale
    { id: currentEntityId, locale: currentLocale, publishedAt: modifiedData.publishedAt },
  ];

  return (
    <Box paddingTop={6}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: getTranslation('plugin.name'),
          defaultMessage: 'Internationalization',
        })}
      </Typography>
      <Divider unsetMargin={false} marginTop={2} marginBottom={4} />
      <Flex direction="column" alignItems="stretch" gap={2}>
        <CMEditViewLocalePicker
          appLocales={locales}
          currentEntityId={currentEntityId!}
          createPermissions={createPermissions}
          localizations={localizations}
          readPermissions={readPermissions}
          currentLocale={currentLocale}
        />
        <CMEditViewCopyLocale
          appLocales={locales}
          currentLocale={currentLocale}
          localizations={localizations}
          readPermissions={readPermissions}
        />
      </Flex>
    </Box>
  );
};

export { CMEditViewInjectedComponents };
