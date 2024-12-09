import { Box, Flex, Popover, Typography, useCollator, Button } from '@strapi/design-system';
import { CaretDown } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Locale } from '../../../shared/contracts/locales';
import { useGetLocalesQuery } from '../services/locales';

interface LocaleListCellProps {
  localizations: { locale: string }[];
  locale: string;
}

const LocaleListCell = ({ locale: currentLocale, localizations }: LocaleListCellProps) => {
  const { locale: language } = useIntl();
  const { data: locales = [] } = useGetLocalesQuery();
  const formatter = useCollator(language, {
    sensitivity: 'base',
  });

  if (!Array.isArray(locales) || !localizations) {
    return null;
  }

  const availableLocales = localizations.map((loc) => loc.locale);

  const localesForDocument = locales
    .reduce<Locale[]>((acc, locale) => {
      const createdLocale = [currentLocale, ...availableLocales].find((loc) => {
        return loc === locale.code;
      });

      if (createdLocale) {
        acc.push(locale);
      }

      return acc;
    }, [])
    .map((locale) => {
      if (locale.isDefault) {
        return `${locale.name} (default)`;
      }

      return locale.name;
    })
    .toSorted((a, b) => formatter.compare(a, b));

  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button variant="ghost" type="button" onClick={(e) => e.stopPropagation()}>
          <Flex minWidth="100%" alignItems="center" justifyContent="center" fontWeight="regular">
            <Typography textColor="neutral800" ellipsis marginRight={2}>
              {localesForDocument.join(', ')}
            </Typography>
            <Flex>
              <CaretDown width="1.2rem" height="1.2rem" />
            </Flex>
          </Flex>
        </Button>
      </Popover.Trigger>
      <Popover.Content sideOffset={16}>
        <ul>
          {localesForDocument.map((name) => (
            <Box key={name} padding={3} tag="li">
              <Typography>{name}</Typography>
            </Box>
          ))}
        </ul>
      </Popover.Content>
    </Popover.Root>
  );
};

export { LocaleListCell };
export type { LocaleListCellProps };
