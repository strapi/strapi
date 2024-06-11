/**
 *
 * FormModalHeader
 *
 */
import { Box, Flex, Breadcrumbs, Crumb, Link, Modal } from '@strapi/design-system';
import { ArrowLeft } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

import { useDataManager } from '../hooks/useDataManager';
import { useFormModalNavigation } from '../hooks/useFormModalNavigation';
import { getTrad } from '../utils';

import { AttributeIcon, IconByType } from './AttributeIcon';

import type { SchemaType } from '../types';
import type { Internal } from '@strapi/types';

interface Header {
  label: string;
  info?: { category: string; name: string };
}

interface FormModalHeaderProps {
  actionType?: string | null;
  attributeName: string;
  attributeType: IconByType;
  categoryName: string;
  contentTypeKind: IconByType;
  dynamicZoneTarget: string;
  forTarget: SchemaType;
  modalType: string | null;
  targetUid: Internal.UID.Schema;
  customFieldUid?: string | null;
  showBackLink?: boolean;
}

export const FormModalHeader = ({
  actionType = null,
  attributeName,
  attributeType,
  categoryName,
  contentTypeKind,
  dynamicZoneTarget,
  forTarget,
  modalType = null,
  targetUid,
  customFieldUid = null,
  showBackLink = false,
}: FormModalHeaderProps) => {
  const { formatMessage } = useIntl();
  const { modifiedData } = useDataManager();
  const { onOpenModalAddField } = useFormModalNavigation();

  let icon: IconByType = 'component';
  let headers: Header[] = [];

  const schema = modifiedData?.[forTarget]?.[targetUid] || modifiedData?.[forTarget] || null;
  const displayName = schema?.schema.displayName;

  if (modalType === 'contentType') {
    icon = contentTypeKind;
  }

  if (['component', 'editCategory'].includes(modalType || '')) {
    icon = 'component';
  }

  const isCreatingMainSchema = ['component', 'contentType'].includes(modalType || '');

  if (isCreatingMainSchema) {
    let headerId = getTrad(`modalForm.component.header-${actionType}`);

    if (modalType === 'contentType') {
      headerId = getTrad(`modalForm.${contentTypeKind}.header-create`);
    }

    if (actionType === 'edit') {
      headerId = getTrad(`modalForm.header-edit`);
    }

    return (
      <Modal.Header>
        <Flex>
          <Box>
            <AttributeIcon type={icon} />
          </Box>
          <Box paddingLeft={3}>
            <Modal.Title>{formatMessage({ id: headerId }, { name: displayName })}</Modal.Title>
          </Box>
        </Flex>
      </Modal.Header>
    );
  }

  headers = [
    {
      label: displayName,
      info: { category: schema?.category || null, name: schema?.schema.displayName },
    },
  ];

  if (modalType === 'chooseAttribute') {
    icon = ['component', 'components'].includes(forTarget) ? 'component' : schema.schema.kind;
  }

  if (modalType === 'addComponentToDynamicZone') {
    icon = 'dynamiczone';
    headers.push({ label: dynamicZoneTarget });
  }

  if (modalType === 'attribute' || modalType === 'customField') {
    icon = attributeType;
    headers.push({ label: attributeName });
  }

  if (modalType === 'editCategory') {
    const label = formatMessage({
      id: getTrad('modalForm.header.categories'),
      defaultMessage: 'Categories',
    });

    headers = [{ label }, { label: categoryName }];
  }

  return (
    <Modal.Header>
      <Flex gap={3}>
        {showBackLink && (
          // This is a workaround and should use the LinkButton with a variant that currently doesn't exist
          <Link
            aria-label={formatMessage({
              id: getTrad('modalForm.header.back'),
              defaultMessage: 'Back',
            })}
            startIcon={<ArrowLeft />}
            onClick={() => onOpenModalAddField({ forTarget, targetUid })}
            href="#back"
            isExternal={false}
          />
        )}
        <AttributeIcon type={icon} customField={customFieldUid} />

        <Breadcrumbs label={headers.map(({ label }) => label).join(',')}>
          {headers.map(({ label, info }, index, arr) => {
            label = upperFirst(label);

            if (!label) {
              return null;
            }

            const key = `${label}.${index}`;

            if (info?.category) {
              label = `${label} (${upperFirst(info.category)} - ${upperFirst(info.name)})`;
            }

            return (
              <Crumb isCurrent={index === arr.length - 1} key={key}>
                {label}
              </Crumb>
            );
          })}
        </Breadcrumbs>
      </Flex>
    </Modal.Header>
  );
};
