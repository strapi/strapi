import * as React from 'react';

import { Box, Flex, Popover, Tooltip, Typography } from '@strapi/design-system';
import { SortIcon } from '@strapi/helper-plugin';
import { Entity } from '@strapi/types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useTypedSelector } from '../store/hooks';
import { getTranslation } from '../utils/getTranslation';

interface LocaleListCellProps {
  id?: Entity.ID;
  localizations?: Array<{ locale: string }>;
  locale?: string;
}

const LocaleListCell = ({
  localizations = [],
  locale: currentLocaleCode,
  id,
}: LocaleListCellProps) => {
  const [visible, setVisible] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const { formatMessage } = useIntl();

  const locales = useTypedSelector((state) => state.i18n_locales.locales);
  const defaultLocale = locales.find((locale) => locale.isDefault);
  const allLocalizations = [{ locale: currentLocaleCode }, ...localizations];
  const localizationNames = allLocalizations.map((locale) => locale.locale);
  const hasDefaultLocale = defaultLocale ? localizationNames.includes(defaultLocale.code) : false;

  const ctLocales = hasDefaultLocale
    ? localizationNames.filter((locale) => locale !== defaultLocale?.code)
    : localizationNames;

  const ctLocalesAsNames = ctLocales.map(
    (locale) => locales.find(({ code }) => code === locale)?.name ?? locale
  );

  ctLocalesAsNames.sort();

  const ctLocalesNamesWithDefault = hasDefaultLocale
    ? [`${defaultLocale?.name} (default)`, ...ctLocalesAsNames]
    : ctLocalesAsNames;

  const localesArray = ctLocalesNamesWithDefault;

  const handleTogglePopover = () => setVisible((prev) => !prev);

  const elId = `entry-${id}__locale`;
  const localesNames = localesArray.join(', ');

  return (
    <Flex onClick={(e) => e.stopPropagation()}>
      <Tooltip
        label={formatMessage({
          id: getTranslation('CMListView.popover.display-locales.label'),
          defaultMessage: 'Display translated locales',
        })}
      >
        <Button type="button" onClick={handleTogglePopover} ref={buttonRef}>
          <ActionWrapper alignItems="center" justifyContent="center" height="2rem">
            <Typography
              style={{ maxWidth: '252px', cursor: 'pointer' }}
              data-for={elId}
              data-tip={localesNames}
              textColor="neutral800"
              ellipsis
            >
              {localesNames}
            </Typography>
            <Flex>
              <SortIcon />

              {visible && (
                <Popover
                  onDismiss={handleTogglePopover}
                  source={buttonRef as React.MutableRefObject<HTMLElement>}
                  spacing={16}
                  centered
                >
                  <ul>
                    {localesArray.map((name) => (
                      <Box key={name} padding={3} as="li">
                        <Typography>{name}</Typography>
                      </Box>
                    ))}
                  </ul>
                </Popover>
              )}
            </Flex>
          </ActionWrapper>
        </Button>
      </Tooltip>
    </Flex>
  );
};

const Button = styled.button`
  svg {
    > g,
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
  &:hover {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral600};
      }
    }
  }
  &:active {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral400};
      }
    }
  }
`;

const ActionWrapper = styled(Flex)`
  svg {
    height: ${4 / 16}rem;
  }
`;

export { LocaleListCell };
export type { LocaleListCellProps };
