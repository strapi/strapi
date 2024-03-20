import * as React from 'react';

import { unstable_useDocument as useDocument } from '@strapi/admin/strapi-admin';
import { Box, Flex, Popover, Typography, useCollator } from '@strapi/design-system';
import { CarretDown } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { Locale } from '../../../shared/contracts/locales';
import { useGetLocalesQuery } from '../services/locales';

interface LocaleListCellProps {
  documentId: string;
  collectionType: string;
  locale: string;
  model: string;
}

const LocaleListCell = ({
  documentId,
  locale: currentLocale,
  collectionType,
  model,
}: LocaleListCellProps) => {
  const { meta, isLoading } = useDocument({
    documentId,
    collectionType,
    model,
    params: {
      locale: currentLocale,
    },
  });

  const { locale: language } = useIntl();
  const [visible, setVisible] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const { data: locales = [] } = useGetLocalesQuery();
  const handleTogglePopover: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setVisible((prev) => !prev);
  };
  const formatter = useCollator(language, {
    sensitivity: 'base',
  });

  if (!Array.isArray(locales) || isLoading) {
    return null;
  }

  const availableLocales = meta?.availableLocales.map((doc) => doc.locale) ?? [];
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
    <Button type="button" onClick={handleTogglePopover} ref={buttonRef}>
      <ActionWrapper
        minWidth="100%"
        alignItems="center"
        justifyContent="center"
        height="2rem"
        width="2rem"
      >
        <Typography textColor="neutral800" ellipsis>
          {localesForDocument.join(', ')}
        </Typography>
        <Flex>
          <CarretDown />
        </Flex>
      </ActionWrapper>
      {visible && (
        <Popover
          onDismiss={() => setVisible(false)}
          source={buttonRef as React.MutableRefObject<HTMLElement>}
          spacing={16}
          centered
        >
          <ul>
            {localesForDocument.map((name) => (
              <Box key={name} padding={3} as="li">
                <Typography>{name}</Typography>
              </Box>
            ))}
          </ul>
        </Popover>
      )}
    </Button>
  );
};

const Button = styled.button`
  width: 100%;

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
