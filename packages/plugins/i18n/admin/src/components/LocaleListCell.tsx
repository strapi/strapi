import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Flex, Menu, Typography, useCollator } from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { useGetLocalesQuery } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';

import type { I18nBaseQuery } from '../types';

interface LocaleListCellProps {
  localizations: { locale: string }[];
  locale: string;
  documentId: string;
}

const LocaleListCell = ({
  locale: currentLocale,
  localizations,
  documentId,
}: LocaleListCellProps) => {
  const { locale: language, formatMessage } = useIntl();
  const { data: locales = [] } = useGetLocalesQuery();
  const navigate = useNavigate();
  const [{ query }] = useQueryParams<I18nBaseQuery>();
  const formatter = useCollator(language, {
    sensitivity: 'base',
  });

  if (!Array.isArray(locales) || !localizations) {
    return null;
  }

  const availableLocales = localizations.map((loc) => loc.locale);

  const localesForDocument = locales
    .reduce<Array<{ code: string; name: string }>>((acc, locale) => {
      const createdLocale = [currentLocale, ...availableLocales].find((loc) => {
        return loc === locale.code;
      });

      if (createdLocale) {
        const name = locale.isDefault ? `${locale.name} (default)` : locale.name;
        acc.push({ code: locale.code, name });
      }

      return acc;
    }, [])
    .toSorted((a, b) => formatter.compare(a.name, b.name));

  const getDisplayText = () => {
    const displayedLocales = localesForDocument.slice(0, 2);
    const remainingCount = localesForDocument.length - 2;

    const baseText = displayedLocales.map(({ name }) => name).join(', ');

    if (remainingCount <= 0) {
      return baseText;
    }

    return formatMessage(
      {
        id: getTranslation('CMListView.popover.display-locales.more'),
        defaultMessage: '{locales} + {count} more',
      },
      { locales: baseText, count: remainingCount }
    );
  };

  const handleLocaleClick = (localeCode: string) => {
    navigate({
      pathname: documentId,
      search: stringify({
        plugins: {
          ...query.plugins,
          i18n: { locale: localeCode },
        },
      }),
    });
  };

  return (
    <Menu.Root>
      <Menu.Trigger>
        <Flex minWidth="100%" alignItems="center" justifyContent="center" fontWeight="regular">
          <Typography textColor="neutral800" ellipsis marginRight={2}>
            {getDisplayText()}
          </Typography>
        </Flex>
      </Menu.Trigger>
      <Menu.Content>
        {localesForDocument.map(({ code, name }) => (
          <Menu.Item
            key={code}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleLocaleClick(code);
            }}
          >
            <Typography textColor="neutral800" fontWeight="regular">
              {name}
            </Typography>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};

export { LocaleListCell };
export type { LocaleListCellProps };
