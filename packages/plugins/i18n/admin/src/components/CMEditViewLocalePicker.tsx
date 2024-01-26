import { SingleSelect, SingleSelectOption, SingleSelectProps } from '@strapi/design-system';
import {
  Permission,
  pxToRem,
  useCMEditViewDataManager,
  useQueryParams,
} from '@strapi/helper-plugin';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { I18nBaseQuery } from '../types';
import { Localization } from '../utils/data';
import { getTranslation } from '../utils/getTranslation';

import type { Locale } from '../store/reducers';
import type { Entity } from '@strapi/types';

export interface CMEditViewLocalePickerProps {
  appLocales: Locale[];
  createPermissions: Permission[];
  currentEntityId: Entity.ID;
  currentLocale: string;
  localizations: Localization[];
  readPermissions: Permission[];
}

/* -------------------------------------------------------------------------------------------------
 * CMEditViewLocalePicker
 * -----------------------------------------------------------------------------------------------*/

const CMEditViewLocalePicker = ({
  appLocales = [],
  createPermissions = [],
  currentEntityId,
  currentLocale,
  localizations = [],
  readPermissions = [],
}: CMEditViewLocalePickerProps) => {
  const { formatMessage } = useIntl();
  const { hasDraftAndPublish, isSingleType, slug } = useCMEditViewDataManager();

  const [{ query }, setQuery] = useQueryParams<I18nBaseQuery>({
    plugins: { i18n: { locale: currentLocale } },
  });

  const { push } = useHistory();

  const handleChange: SingleSelectProps['onChange'] = (v) => {
    /**
     * The DS technically handles numbers and strings, this will change to only
     * accept strings in the future. In the meanwhile we just convert the value.
     */
    const value = String(v);

    if (value === currentLocale) {
      return;
    }

    const { status, id } = options.find((option) => {
      return option.value === value;
    })!;

    const defaultParams = {
      plugins: {
        ...query.plugins,
        i18n: { ...query.plugins?.i18n, locale: value },
      },
    };

    /**
     * TODO: can this be undefined?
     */
    if (currentEntityId) {
      defaultParams.plugins.i18n.relatedEntityId = currentEntityId;
    }

    if (isSingleType) {
      setQuery(defaultParams);

      return;
    }

    /**
     * TODO: if D&P is not enabled, then the status will always say there's no locale so
     * we also should check there's no ID incase. This logic will be removed in V5 when
     * we _always_ have D&P.
     */
    if (status === 'did-not-create-locale' && !id) {
      push({
        pathname: `/content-manager/collection-types/${slug}/create`,
        search: stringify(defaultParams, { encode: false }),
      });
    } else {
      push({
        pathname: `/content-manager/collection-types/${slug}/${id}`,
        search: stringify(defaultParams, { encode: false }),
      });
    }
  };

  const options = appLocales
    .map(({ name, code }) => {
      const matchingLocaleInData = localizations.find(({ locale }) => locale === code);

      let status: BulletProps['status'] = 'did-not-create-locale';

      if (matchingLocaleInData && matchingLocaleInData.publishedAt !== undefined) {
        status = matchingLocaleInData.publishedAt === null ? 'draft' : 'published';
      }

      return {
        id: matchingLocaleInData ? matchingLocaleInData.id : null,
        label: name,
        value: code,
        status,
      };
    })
    .filter(({ status, value }) => {
      if (status === 'did-not-create-locale') {
        return createPermissions.find(({ properties }) =>
          (properties?.locales ?? []).includes(value)
        );
      }

      return readPermissions.find(({ properties }) => (properties?.locales ?? []).includes(value));
    });

  if (!currentLocale) {
    return null;
  }

  return (
    <SingleSelect
      label={formatMessage({
        id: getTranslation('Settings.locales.modal.locales.label'),
        defaultMessage: 'Locales',
      })}
      onChange={handleChange}
      value={currentLocale}
    >
      {options.map((option) => {
        return (
          <SingleSelectOption
            key={option.value}
            value={option.value}
            startIcon={hasDraftAndPublish ? <Bullet status={option.status} /> : null}
          >
            {option.label}
          </SingleSelectOption>
        );
      })}
    </SingleSelect>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Bullet
 * -----------------------------------------------------------------------------------------------*/

const statusMap = {
  'did-not-create-locale': {
    backgroundColor: 'neutral0',
    borderColor: 'neutral500',
  },
  draft: {
    backgroundColor: 'secondary700',
  },
  published: {
    backgroundColor: 'success700',
  },
};

const statusToTitleMap = {
  draft: 'content-manager.components.Select.draft-info-title',
  published: 'content-manager.components.Select.publish-info-title',
  'did-not-create-locale': getTranslation('components.Select.locales.not-available'),
};

type BulletProps = {
  status: keyof typeof statusMap;
};

const Bullet = ({ status }: BulletProps) => {
  const { formatMessage } = useIntl();

  return <StyledBullet status={status} title={formatMessage({ id: statusToTitleMap[status] })} />;
};

const StyledBullet = styled.div<{ status: keyof typeof statusMap }>`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  border: ${({ theme, status }) => {
    const statusStyle = statusMap[status];
    if ('borderColor' in statusStyle) {
      return `1px solid ${theme.colors[statusStyle.borderColor]}`;
    }

    return 'none';
  }};
  background: ${({ theme, status }) => theme.colors[statusMap[status].backgroundColor]};
  border-radius: 50%;
  cursor: pointer;
`;

export { CMEditViewLocalePicker };
