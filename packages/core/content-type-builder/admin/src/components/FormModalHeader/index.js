/**
 *
 * FormModalHeader
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import { Breadcrumbs, Crumb } from '@strapi/design-system/Breadcrumbs';
import { ModalHeader } from '@strapi/design-system/ModalLayout';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import useDataManager from '../../hooks/useDataManager';
import getTrad from '../../utils/getTrad';
import AttributeIcon from '../AttributeIcon';

const FormModalHeader = ({
  actionType,
  attributeName,
  attributeType,
  categoryName,
  contentTypeKind,
  dynamicZoneTarget,
  forTarget,
  modalType,
  targetUid,
}) => {
  const { formatMessage } = useIntl();
  const { modifiedData } = useDataManager();

  let icon;
  let headers = [];

  const schema = modifiedData?.[forTarget]?.[targetUid] || modifiedData?.[forTarget] || null;
  let displayName = schema?.schema.displayName;

  if (modalType === 'contentType') {
    icon = contentTypeKind;
  }

  if (['component', 'editCategory'].includes(modalType)) {
    icon = 'component';
  }

  const isCreatingMainSchema = ['component', 'contentType'].includes(modalType);

  if (isCreatingMainSchema) {
    let headerId = getTrad(`modalForm.component.header-${actionType}`);

    if (modalType === 'contentType') {
      headerId = getTrad(`modalForm.${contentTypeKind}.header-create`);
    }

    if (actionType === 'edit') {
      headerId = getTrad(`modalForm.header-edit`);
    }

    return (
      <ModalHeader>
        <Flex>
          <Box>
            <AttributeIcon type={icon} />
          </Box>
          <Box paddingLeft={3}>
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
              {formatMessage({ id: headerId }, { name: displayName })}
            </Typography>
          </Box>
        </Flex>
      </ModalHeader>
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

  if (modalType === 'attribute') {
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

  const breadcrumbsLabel = headers.map(({ label }) => label).join(',');

  return (
    <ModalHeader>
      <Stack horizontal size={3}>
        <AttributeIcon type={icon} />

        <Breadcrumbs label={breadcrumbsLabel}>
          {headers.map((header, index) => {
            const label = upperFirst(header.label);

            if (!label) {
              return null;
            }

            const key = `${header.label}.${index}`;

            if (header.info?.category) {
              const content = `${label} (${upperFirst(header.info.category)} - ${upperFirst(
                header.info.name
              )})`;

              return <Crumb key={key}>{content}</Crumb>;
            }

            return <Crumb key={key}>{label}</Crumb>;
          })}
        </Breadcrumbs>
      </Stack>
    </ModalHeader>
  );
};

FormModalHeader.defaultProps = {
  actionType: null,
  attributeName: null,
  attributeType: null,
  categoryName: null,
  dynamicZoneTarget: null,
  forTarget: null,
  contentTypeKind: null,
  targetUid: null,
};

FormModalHeader.propTypes = {
  actionType: PropTypes.string,
  attributeName: PropTypes.string,
  attributeType: PropTypes.string,
  categoryName: PropTypes.string,
  contentTypeKind: PropTypes.string,
  dynamicZoneTarget: PropTypes.string,
  forTarget: PropTypes.oneOf(['contentType', 'component', 'components']),
  modalType: PropTypes.string.isRequired,
  targetUid: PropTypes.string,
};

export default FormModalHeader;
