import * as React from 'react';

import {
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Typography,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  ContentManagerEditViewDataManagerContext,
  GenericInput,
  useQueryParams,
  useStrapiApp,
} from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { HOOKS } from '../../../constants';
import { useTypedDispatch } from '../../../core/store/hooks';
import { DynamicZone } from '../../components/DynamicZone/Field';
import { FieldComponent } from '../../components/FieldComponent';
import { getInputType, useCustomInputs } from '../../components/Inputs';
import { useContentTypeLayout } from '../../hooks/useLayouts';
import { useLazyComponents } from '../../hooks/useLazyComponents';
import { useSyncRbac } from '../../hooks/useSyncRbac';
import { isDynamicZone, splitLayoutIntoPanes } from '../../pages/EditView/EditViewPage';
import { setLayout } from '../../pages/EditViewLayoutManager';
import { getFieldsActionMatchingPermissions } from '../../utils/permissions';

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
  const dispatch = useTypedDispatch();

  const { runHookWaterfall } = useStrapiApp();
  const mutatedLayout = runHookWaterfall(HOOKS.MUTATE_EDIT_VIEW_LAYOUT, { layout, query });

  React.useEffect(() => {
    if (mutatedLayout.layout) {
      dispatch(setLayout(mutatedLayout.layout, query));
    }
  }, [dispatch, mutatedLayout, query]);

  const { permissions } = useSyncRbac(query, layout?.contentType.uid, 'editView');

  const { readActionAllowedFields } = getFieldsActionMatchingPermissions(
    permissions ?? [],
    mutatedLayout.layout!.contentType.uid
  );

  const getCustomFields = React.useCallback(() => {
    if (!mutatedLayout.layout) {
      return [];
    }

    const customFields: string[] = [];
    Object.values(mutatedLayout.layout.contentType.attributes).forEach((value) => {
      if ('customField' in value) {
        customFields.push(value.customField as string);
      }
    });

    Object.values(mutatedLayout.layout.components).forEach((component) => {
      Object.values(component.attributes).forEach((value) => {
        if ('customField' in value) {
          customFields.push(value.customField as string);
        }
      });
    });

    return customFields;
  }, [mutatedLayout.layout]);

  const { isLazyLoading, lazyComponentStore } = useLazyComponents(getCustomFields());
  const customInputs = useCustomInputs(lazyComponentStore);

  // TODO: better loading
  if (isLoading || !mutatedLayout.layout || isLazyLoading) {
    return null;
  }

  const layoutPanes = splitLayoutIntoPanes(mutatedLayout.layout);

  return (
    <ContentLayout>
      <ContentManagerEditViewDataManagerContext.Provider
        value={{
          isCreatingEntry: false,
          modifiedData: version.data,
          allLayoutData: mutatedLayout.layout,
          readActionAllowedFields,
          /**
           * We're not passing create and update actions on purpose, even though we have them
           * because not giving them disables all the nested fields, which is what we want
           */
          createActionAllowedFields: [],
          updateActionAllowedFields: [],
          formErrors: {},
          initialData: version.data,
          isSingleType: mutatedLayout.layout.contentType.kind === 'singleType',
        }}
      >
        {/* Position relative is needed to prevent VisuallyHidden from breaking the layout */}
        <Flex direction="column" alignItems="stretch" gap={6} position="relative" marginBottom={6}>
          {layoutPanes.map((pane, paneIndex) => {
            if (isDynamicZone(pane)) {
              const [[{ name, fieldSchema, metadatas, ...restProps }]] = pane;

              return (
                <DynamicZone
                  name={name}
                  fieldSchema={fieldSchema}
                  metadatas={metadatas}
                  key={paneIndex}
                  {...restProps}
                />
              );
            }

            return (
              <Flex
                direction="column"
                alignItems="stretch"
                gap={4}
                background="neutral0"
                shadow="tableShadow"
                paddingLeft={6}
                paddingRight={6}
                paddingTop={6}
                paddingBottom={6}
                borderColor="neutral150"
                hasRadius
                key={paneIndex}
              >
                {pane.map((row, rowIndex) => (
                  <Grid gap={4} key={rowIndex}>
                    {row.map((column, columnIndex) => {
                      const attribute = mutatedLayout.layout!.contentType.attributes[column.name];
                      const { type } = attribute;
                      const customFieldUid = (attribute as { customField?: string }).customField;

                      if (UNSUPPORTED_TYPES.includes(type)) {
                        return (
                          <GridItem col={column.size} key={columnIndex}>
                            <Typography>TODO {type}</Typography>
                          </GridItem>
                        );
                      }

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
              </Flex>
            );
          })}
        </Flex>
      </ContentManagerEditViewDataManagerContext.Provider>
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
    <Main grow={1} height="100vh" overflow="auto" labelledBy={headerId}>
      <VersionHeader version={version} headerId={headerId} />
      <VersionContent version={version} />
    </Main>
  );
};

export { VersionDetails };
