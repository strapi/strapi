import * as React from 'react';

import {
  Box,
  BoxComponent,
  Flex,
  FlexComponent,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../constants/theme';
import { useTypedDispatch, useTypedSelector } from '../core/store/hooks';
import { setLocale } from '../reducer';

const Wrapper = styled<BoxComponent>(Box)`
  margin: 0 auto;
  width: 100%;
  max-width: 55.2rem;
`;

export const Column = styled<FlexComponent>(Flex)`
  flex-direction: column;
`;

const LocaleToggle = () => {
  const localeNames = useTypedSelector((state) => state.admin_app.language.localeNames);
  const dispatch = useTypedDispatch();
  const { formatMessage, locale } = useIntl();

  return (
    <SingleSelect
      aria-label={formatMessage({
        id: 'global.localeToggle.label',
        defaultMessage: 'Select interface language',
      })}
      value={locale}
      onChange={(language) => {
        dispatch(setLocale(language as string));
      }}
    >
      {Object.entries(localeNames).map(([language, name]) => (
        <SingleSelectOption key={language} value={language}>
          {name}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};

interface LayoutContentProps {
  children: React.ReactNode;
}

export const LayoutContent = ({ children }: LayoutContentProps) => (
  <Wrapper
    shadow="tableShadow"
    hasRadius
    paddingTop={RESPONSIVE_DEFAULT_SPACING}
    paddingBottom={RESPONSIVE_DEFAULT_SPACING}
    paddingLeft={RESPONSIVE_DEFAULT_SPACING}
    paddingRight={RESPONSIVE_DEFAULT_SPACING}
    background="neutral0"
  >
    {children}
  </Wrapper>
);

interface UnauthenticatedLayoutProps {
  children: React.ReactNode;
}

export const UnauthenticatedLayout = ({ children }: UnauthenticatedLayoutProps) => {
  return (
    <div>
      <Flex tag="header" justifyContent="flex-end">
        <Box paddingTop={6} paddingRight={RESPONSIVE_DEFAULT_SPACING}>
          <LocaleToggle />
        </Box>
      </Flex>
      <Box
        paddingTop={2}
        paddingBottom={RESPONSIVE_DEFAULT_SPACING}
        marginLeft={RESPONSIVE_DEFAULT_SPACING}
        marginRight={RESPONSIVE_DEFAULT_SPACING}
      >
        {children}
      </Box>
    </div>
  );
};
