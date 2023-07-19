/**
 *
 * FormModalHeader
 *
 */

import React from 'react';

import { Box, Flex, ModalHeader, Typography } from '@strapi/design-system';
import { Breadcrumbs, Crumb } from '@strapi/design-system/v2';
import { Link } from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import useDataManager from '../../hooks/useDataManager';
import useFormModalNavigation from '../../hooks/useFormModalNavigation';
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
  customFieldUid,
  showBackLink,
}) => {
  const { formatMessage } = useIntl();
  const { modifiedData } = useDataManager();
  const { onOpenModalAddField } = useFormModalNavigation();

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
    <ModalHeader>
      <Flex gap={3}>
        {showBackLink && (
          <Link
            aria-label={formatMessage({
              id: getTrad('modalForm.header.back'),
              defaultMessage: 'Back',
            })}
            startIcon={<ArrowLeft />}
            onClick={() => onOpenModalAddField({ forTarget, targetUid })}
            to="#back"
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
  customFieldUid: null,
  showBackLink: false,
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
  customFieldUid: PropTypes.string,
  showBackLink: PropTypes.bool,
};

export default FormModalHeader;
