import * as React from 'react';

import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import {
  NotAllowedInput,
  TranslationMessage,
  useCMEditViewDataManager,
} from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';
import { get, size } from 'lodash/fp';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useContentTypeLayout } from '../hooks/useContentTypeLayout';
import { getFieldName } from '../utils/fields';
import { getTranslation } from '../utils/translations';

import { ComponentInitializer } from './ComponentInitializer';
import { NonRepeatableComponent } from './NonRepeatableComponent';
import { RepeatableComponent } from './RepeatableComponent';

interface FieldComponentProps {
  componentUid: string;
  intlLabel?: TranslationMessage;
  isFromDynamicZone?: boolean;
  isRepeatable?: boolean;
  isNested?: boolean;
  labelAction?: React.ReactNode;
  max?: number;
  min?: number;
  name: string;
  required?: boolean;
}

const FieldComponent = ({
  componentUid,
  intlLabel,
  isFromDynamicZone,
  isRepeatable,
  isNested,
  labelAction,
  max = Infinity,
  min = -Infinity,
  name,
  required,
}: FieldComponentProps) => {
  const { formatMessage } = useIntl();
  const {
    addNonRepeatableComponentToField,
    createActionAllowedFields,
    isCreatingEntry,
    modifiedData,
    removeComponentFromField,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useCMEditViewDataManager();
  const { contentType } = useContentTypeLayout();

  // This is used for the readonly mode when updating an entry
  const allDynamicZoneFields = React.useMemo(() => {
    const attributes = contentType?.attributes ?? {};

    return Object.keys(attributes).filter(
      (attrName) => attributes[attrName].type === 'dynamiczone'
    );
  }, [contentType]);

  const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

  // Use lodash get since the name can be a nested path (e.g. "component.1.component")
  const componentValue = get(name, modifiedData) ?? null;
  const compoName = getFieldName(name);

  const hasChildrenAllowedFields = React.useMemo(() => {
    if (isFromDynamicZone && isCreatingEntry) {
      return true;
    }

    const includedDynamicZoneFields = allowedFields.filter((name) => name === compoName[0]);

    if (includedDynamicZoneFields.length > 0) {
      return true;
    }

    const relatedChildrenAllowedFields = allowedFields
      .map((fieldName) => {
        return fieldName.split('.');
      })
      .filter((fieldName) => {
        if (fieldName.length < compoName.length) {
          return false;
        }

        return fieldName.slice(0, compoName.length).join('.') === compoName.join('.');
      });

    return relatedChildrenAllowedFields.length > 0;
  }, [isFromDynamicZone, isCreatingEntry, allowedFields, compoName]);

  // This is used only when updating an entry
  const hasChildrenReadableFields = React.useMemo(() => {
    if (isFromDynamicZone) {
      return true;
    }
    if (allDynamicZoneFields.includes(compoName[0])) {
      return true;
    }

    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    const relatedChildrenAllowedFields = allowedFields
      .map((fieldName) => {
        return fieldName.split('.');
      })
      .filter((fieldName) => {
        if (fieldName.length < compoName.length) {
          return false;
        }

        return fieldName.slice(0, compoName.length).join('.') === compoName.join('.');
      });

    return relatedChildrenAllowedFields.length > 0;
  }, [
    isFromDynamicZone,
    allDynamicZoneFields,
    compoName,
    isCreatingEntry,
    readActionAllowedFields,
  ]);

  const isReadOnly = isCreatingEntry
    ? false
    : hasChildrenAllowedFields
    ? false
    : hasChildrenReadableFields;

  const componentValueLength = size(componentValue);
  const isInitialized = componentValue !== null || isFromDynamicZone;
  const showResetComponent =
    !isRepeatable && isInitialized && !isFromDynamicZone && hasChildrenAllowedFields;

  const { getComponentLayout, components } = useContentTypeLayout();
  const componentLayoutData = getComponentLayout(componentUid);

  if (!hasChildrenAllowedFields && isCreatingEntry) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  if (!hasChildrenAllowedFields && !isCreatingEntry && !hasChildrenReadableFields) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  const handleClickAddNonRepeatableComponentToField = () => {
    addNonRepeatableComponentToField?.(name, componentLayoutData, components);
  };

  return (
    <Box>
      <Flex justifyContent="space-between">
        {intlLabel && (
          <Flex paddingBottom={1}>
            <Typography
              textColor="neutral800"
              htmlFor={name}
              variant="pi"
              fontWeight="bold"
              as="label"
            >
              {formatMessage(intlLabel)}
              {isRepeatable && <>&nbsp;({componentValueLength})</>}
              {required && <Typography textColor="danger600">*</Typography>}
            </Typography>
            {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
          </Flex>
        )}

        {showResetComponent && (
          <IconButton
            label={formatMessage({
              id: getTranslation('components.reset-entry'),
              defaultMessage: 'Reset Entry',
            })}
            icon={<Trash />}
            noBorder
            onClick={() => {
              removeComponentFromField?.(name, componentUid);
            }}
          />
        )}
      </Flex>
      <Flex direction="column" alignItems="stretch" gap={1}>
        {!isRepeatable && !isInitialized && (
          <ComponentInitializer
            isReadOnly={isReadOnly}
            onClick={handleClickAddNonRepeatableComponentToField}
          />
        )}
        {!isRepeatable && isInitialized && (
          <NonRepeatableComponent
            componentUid={componentUid}
            isFromDynamicZone={isFromDynamicZone}
            isNested={isNested}
            name={name}
          />
        )}
        {isRepeatable && (
          <RepeatableComponent
            componentValue={componentValue ?? undefined}
            componentValueLength={componentValueLength}
            componentUid={componentUid}
            isReadOnly={isReadOnly}
            max={max}
            min={min}
            name={name}
          />
        )}
      </Flex>
    </Box>
  );
};

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

export { FieldComponent };
