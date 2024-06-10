import * as React from 'react';

import { useTracking, useRBAC, useQueryParams } from '@strapi/admin/strapi-admin';
import {
  Flex,
  IconButton,
  Popover,
  Checkbox,
  TextButton,
  Typography,
  useCollator,
  LinkButton,
} from '@strapi/design-system';
import { Cog, ListPlus } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useDoc } from '../../../hooks/useDocument';
import { useDocumentLayout } from '../../../hooks/useDocumentLayout';
import { useTypedSelector } from '../../../modules/hooks';
import { checkIfAttributeIsDisplayable } from '../../../utils/attributes';

interface ViewSettingsMenuProps extends FieldPickerProps {}

const ViewSettingsMenu = (props: ViewSettingsMenuProps) => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.collectionTypesConfigurations ?? []
  );
  const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();
  const { formatMessage } = useIntl();
  const {
    allowedActions: { canConfigureView },
  } = useRBAC(permissions);

  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton
          label={formatMessage({
            id: 'components.ViewSettings.tooltip',
            defaultMessage: 'View Settings',
          })}
        >
          <Cog />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content side="bottom" align="end" sideOffset={4}>
        <Flex alignItems="stretch" direction="column" padding={3} gap={3}>
          {canConfigureView ? (
            <LinkButton
              size="S"
              startIcon={<ListPlus />}
              variant="secondary"
              tag={NavLink}
              to={{
                pathname: 'configurations/list',
                search: query.plugins
                  ? stringify({ plugins: query.plugins }, { encode: false })
                  : '',
              }}
            >
              {formatMessage({
                id: 'app.links.configure-view',
                defaultMessage: 'Configure the view',
              })}
            </LinkButton>
          ) : null}
          <FieldPicker {...props} />
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
};

interface FieldPickerProps {
  headers?: string[];
  setHeaders: (headers: string[]) => void;
  resetHeaders: () => void;
}

const FieldPicker = ({ headers = [], resetHeaders, setHeaders }: FieldPickerProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage, locale } = useIntl();

  const { schema, model } = useDoc();
  const { list } = useDocumentLayout(model);

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const attributes = schema?.attributes ?? {};

  const columns = Object.keys(attributes)
    .filter((name) => checkIfAttributeIsDisplayable(attributes[name]))
    .map((name) => ({
      name,
      label: list.metadatas[name]?.label ?? '',
    }))
    .sort((a, b) => formatter.compare(a.label, b.label));

  const handleChange = (name: string) => {
    trackUsage('didChangeDisplayedFields');

    /**
     * create an array of the new headers, if the new name exists it should be removed,
     * otherwise it should be added
     */
    const newHeaders = headers.includes(name)
      ? headers.filter((header) => header !== name)
      : [...headers, name];

    setHeaders(newHeaders);
  };

  const handleReset = () => {
    resetHeaders();
  };

  return (
    <Flex tag="fieldset" direction="column" alignItems="stretch" gap={3} borderWidth={0}>
      <Flex justifyContent="space-between">
        <Typography tag="legend" variant="pi" fontWeight="bold">
          {formatMessage({
            id: 'containers.list.displayedFields',
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
          const isActive = headers.includes(header.name);

          return (
            <Flex
              wrap="wrap"
              gap={2}
              background={isActive ? 'primary100' : 'transparent'}
              hasRadius
              padding={2}
              key={header.name}
            >
              <Checkbox
                onCheckedChange={() => handleChange(header.name)}
                checked={isActive}
                name={header.name}
              >
                <Typography fontSize={1}>{header.label}</Typography>
              </Checkbox>
            </Flex>
          );
        })}
      </Flex>
    </Flex>
  );
};

export { ViewSettingsMenu };
export type { ViewSettingsMenuProps, FieldPickerProps };
