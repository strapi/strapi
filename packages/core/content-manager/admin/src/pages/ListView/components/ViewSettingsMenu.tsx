import * as React from 'react';

import { useTracking, useRBAC, useQueryParams } from '@strapi/admin/strapi-admin';
import {
  Flex,
  IconButton,
  Popover,
  BaseCheckbox,
  TextButton,
  Typography,
  useCollator,
  LinkButton,
} from '@strapi/design-system';
import { Cog, ListPlus } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { useDoc } from '../../../hooks/useDocument';
import { useDocumentLayout } from '../../../hooks/useDocumentLayout';
import { useTypedSelector } from '../../../modules/hooks';
import { checkIfAttributeIsDisplayable } from '../../../utils/attributes';

interface ViewSettingsMenuProps extends FieldPickerProps {}

const ViewSettingsMenu = (props: ViewSettingsMenuProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const cogButtonRef = React.useRef<HTMLButtonElement>(null!);
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.collectionTypesConfigurations ?? []
  );
  const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();
  const { formatMessage } = useIntl();
  const {
    allowedActions: { canConfigureView },
  } = useRBAC(permissions);

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
            {canConfigureView ? (
              <LinkButton
                size="S"
                startIcon={<ListPlus />}
                variant="secondary"
                tag={NavLink}
                // @ts-expect-error – inference from the as prop does not work in the DS.
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
        </Popover>
      )}
    </>
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
    <Flex tag="fieldset" direction="column" alignItems="stretch" gap={3}>
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
            <ChackboxWrapper
              wrap="wrap"
              gap={2}
              tag="label"
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
export type { ViewSettingsMenuProps, FieldPickerProps };
