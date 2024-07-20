import React from 'react';

import { createSelector } from '@reduxjs/toolkit';
import {
  Flex,
  IconButton,
  Popover,
  BaseCheckbox,
  TextButton,
  Typography,
} from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { CheckPermissions, useCollator, useTracking } from '@strapi/helper-plugin';
import { Cog, Layer } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

import { useTypedSelector, useTypedDispatch } from '../../../../core/store/hooks';
import { checkIfAttributeIsDisplayable } from '../../../utils/attributes';
import { onChangeListHeaders, onResetListHeaders } from '../../ListViewLayoutManager';

import type { RootState } from '../../../../core/store/configure';

interface ViewSettingsMenuProps {
  slug: string;
}

const ViewSettingsMenu = ({ slug }: ViewSettingsMenuProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const cogButtonRef = React.useRef<HTMLButtonElement>(null!);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { formatMessage } = useIntl();

  const handleToggle = () => {
    setIsVisible((prev) => !prev);
  };

  return (
    <>
      <IconButton
        icon={<Cog />}
        label={formatMessage({
          id: 'components.ViewSettings.tooltip',
          defaultMessage: 'View Settings',
        })}
        ref={cogButtonRef}
        onClick={handleToggle}
      />
      {isVisible && (
        <Popover
          placement="bottom-end"
          source={cogButtonRef}
          onDismiss={handleToggle}
          spacing={4}
          padding={3}
        >
          <Flex alignItems="stretch" direction="column" gap={3}>
            <CheckPermissions
              permissions={permissions.contentManager?.collectionTypesConfigurations}
            >
              <LinkButton
                size="S"
                startIcon={<Layer />}
                variant="secondary"
                as={NavLink}
                // @ts-expect-error – inference from the as prop does not work in the DS.
                to={`${slug}/configurations/list`}
              >
                {formatMessage({
                  id: 'app.links.configure-view',
                  defaultMessage: 'Configure the view',
                })}
              </LinkButton>
            </CheckPermissions>

            <FieldPicker />
          </Flex>
        </Popover>
      )}
    </>
  );
};

const selectDisplayedHeaderKeys = createSelector(
  (state: RootState) => state['content-manager_listView'].displayedHeaders,
  (displayedHeaders) => displayedHeaders.map(({ name }) => name)
);

const FieldPicker = () => {
  const dispatch = useTypedDispatch();
  const displayedHeadersKeys = useTypedSelector(selectDisplayedHeaderKeys);
  const contentTypeLayout = useTypedSelector(
    (state) => state['content-manager_listView'].contentType!
  );
  const { trackUsage } = useTracking();
  const { formatMessage, locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const columns = Object.keys(contentTypeLayout.attributes)
    .filter((name) => checkIfAttributeIsDisplayable(contentTypeLayout.attributes[name]))
    .map((name) => ({
      name,
      label: contentTypeLayout.metadatas[name].list.label ?? '',
    }))
    .sort((a, b) => formatter.compare(a.label, b.label));

  const handleChange = (name: string) => {
    trackUsage('didChangeDisplayedFields');
    dispatch(onChangeListHeaders({ name, value: displayedHeadersKeys.includes(name) }));
  };

  const handleReset = () => {
    dispatch(onResetListHeaders());
  };

  return (
    <Flex as="fieldset" direction="column" alignItems="stretch" gap={3}>
      <Flex justifyContent="space-between">
        <Typography as="legend" variant="pi" fontWeight="bold">
          {formatMessage({
            id: 'containers.ListPage.displayedFields',
            defaultMessage: 'Displayed fields',
          })}
        </Typography>

        <TextButton onClick={handleReset}>
          {formatMessage({
            id: 'app.components.Button.reset',
            defaultMessage: 'Reset',
          })}
        </TextButton>
      </Flex>

      <Flex direction="column" alignItems="stretch">
        {columns.map((header) => {
          const isActive = displayedHeadersKeys.includes(header.name);

          return (
            <ChackboxWrapper
              wrap="wrap"
              gap={2}
              as="label"
              background={isActive ? 'primary100' : 'transparent'}
              hasRadius
              padding={2}
              key={header.name}
            >
              <BaseCheckbox
                onChange={() => handleChange(header.name)}
                value={isActive}
                name={header.name}
              />
              <Typography fontSize={1}>{header.label}</Typography>
            </ChackboxWrapper>
          );
        })}
      </Flex>
    </Flex>
  );
};

const ChackboxWrapper = styled(Flex)`
  :hover {
    background-color: ${(props) => props.theme.colors.primary100};
  }
`;

export { ViewSettingsMenu };
export type { ViewSettingsMenuProps };
