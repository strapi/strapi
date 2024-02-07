import * as React from 'react';

import {
  Box,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Typography,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { GenericInput, useQueryParams, useStrapiApp } from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { HOOKS } from '../../../constants';
import { DynamicZone } from '../../components/DynamicZone/Field';
import { FieldComponent } from '../../components/FieldComponent';
import { getInputType, useCustomInputs } from '../../components/Inputs';
import { useContentTypeLayout } from '../../hooks/useLayouts';
import { useLazyComponents } from '../../hooks/useLazyComponents';
import { isDynamicZone, splitLayoutIntoPanes } from '../../pages/EditView/EditViewPage';

/* -------------------------------------------------------------------------------------------------
 * VersionHeader
 * -----------------------------------------------------------------------------------------------*/

interface VersionHeaderProps {
  headerId: string;
  version: Contracts.HistoryVersions.HistoryVersionDataResponse;
}

const VersionHeader = ({ headerId, version }: VersionHeaderProps) => {
  const { formatMessage } = useIntl();

  return (
    <HeaderLayout
      id={headerId}
      title={`History version ${version.id}`}
      navigationAction={
        <Link
          startIcon={<ArrowLeft />}
          as={NavLink}
          // @ts-expect-error - types are not inferred correctly through the as prop.
          to=".."
        >
          {formatMessage({
            id: 'global.back',
            defaultMessage: 'Back',
          })}
        </Link>
      }
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionContent
 * -----------------------------------------------------------------------------------------------*/

interface VersionContentProps {
  version: Contracts.HistoryVersions.HistoryVersionDataResponse;
}

// These types will be added in future PRs, they need special handling
const UNSUPPORTED_TYPES = ['media', 'relation'];

const VersionContent = ({ version }: VersionContentProps) => {
  const [{ query }] = useQueryParams();
  const { isLoading, layout } = useContentTypeLayout(version.contentType);
  const { runHookWaterfall } = useStrapiApp();

  const getCustomFields = React.useCallback(() => {
    if (!layout) {
      return [];
    }

    const customFields: string[] = [];
    Object.values(layout.contentType.attributes).forEach((value) => {
      if ('customField' in value) {
        customFields.push(value.customField as string);
      }
    });

    Object.values(layout?.components).forEach((component) => {
      Object.values(component.attributes).forEach((value) => {
        if ('customField' in value) {
          customFields.push(value.customField as string);
        }
      });
    });

    return customFields;
  }, [layout]);

  const { isLazyLoading, lazyComponentStore } = useLazyComponents(getCustomFields());
  const customInputs = useCustomInputs(lazyComponentStore);

  // TODO: better loading
  if (isLoading || !layout || isLazyLoading) {
    return null;
  }

  const mutatedLayout = runHookWaterfall(HOOKS.MUTATE_EDIT_VIEW_LAYOUT, { layout, query });
  const layoutPanes = splitLayoutIntoPanes(mutatedLayout.layout);

  return (
    <ContentLayout>
      <Flex direction="column" alignItems="stretch" gap={6}>
        {layoutPanes.map((pane, paneIndex) => {
          if (isDynamicZone(pane)) {
            const [[{ name, fieldSchema, metadatas, ...restProps }]] = pane;

            // TODO: fix field permission issue
            return (
              <DynamicZone
                name={name}
                fieldSchema={fieldSchema}
                metadatas={metadatas}
                key={paneIndex}
                {...restProps}
              />
            );

            return <Typography key={paneIndex}>DYNAMIC ZONE</Typography>;
          }

          return (
            <Box
              hasRadius
              background="neutral0"
              shadow="tableShadow"
              paddingLeft={6}
              paddingRight={6}
              paddingTop={6}
              paddingBottom={6}
              borderColor="neutral150"
              key={paneIndex}
            >
              {pane.map((row, rowIndex) => (
                <Grid gap={4} key={rowIndex}>
                  {row.map((column, columnIndex) => {
                    const attribute = layout.contentType.attributes[column.name];
                    const { type } = attribute;
                    const customFieldUid = (attribute as { customField?: string }).customField;

                    if (UNSUPPORTED_TYPES.includes(type)) {
                      return <Typography key={columnIndex}>TODO {type}</Typography>;
                    }

                    // TODO: fix permission issue
                    if (type === 'component') {
                      const {
                        component,
                        max,
                        min,
                        repeatable = false,
                        required = false,
                      } = attribute;

                      return (
                        <GridItem col={column.size} s={12} xs={12} key={component}>
                          <FieldComponent
                            componentUid={component}
                            isRepeatable={repeatable}
                            intlLabel={{
                              id: column.metadatas.label,
                              defaultMessage: column.metadatas.label,
                            }}
                            max={max}
                            min={min}
                            name={column.name}
                            required={required}
                          />
                        </GridItem>
                      );
                    }

                    const getValue = () => {
                      switch (attribute.type) {
                        case 'json':
                          return JSON.stringify(version.data[column.name]);
                        default:
                          return version.data[column.name];
                      }
                    };

                    return (
                      <GridItem col={column.size} key={columnIndex}>
                        <GenericInput
                          name={column.name}
                          intlLabel={{
                            id: column.metadatas.label,
                            defaultMessage: column.metadatas.label,
                          }}
                          type={customFieldUid || getInputType(type)}
                          onChange={() => {}}
                          disabled={true}
                          customInputs={customInputs}
                          value={getValue()}
                          attribute={attribute}
                        />
                      </GridItem>
                    );
                  })}
                </Grid>
              ))}
            </Box>
          );
        })}
      </Flex>
    </ContentLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionDetails
 * -----------------------------------------------------------------------------------------------*/

interface VersionDetailsProps {
  version: Contracts.HistoryVersions.HistoryVersionDataResponse | undefined;
}

const VersionDetails = ({ version }: VersionDetailsProps) => {
  const headerId = React.useId();

  if (!version) {
    // TODO: handle selected version not found when the designs are ready
    return <Main grow={1} />;
  }

  return (
    <Main grow={1} height="100vh" overflow="scroll" labelledBy={headerId}>
      <VersionHeader version={version} headerId={headerId} />
      <VersionContent version={version} />
    </Main>
  );
};

export { VersionDetails };
