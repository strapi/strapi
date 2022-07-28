import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { useCustomFields } from '@strapi/helper-plugin';
import upperFirst from 'lodash/upperFirst';
import { getTrad } from '../../../utils';
import { getModalTitleSubHeader } from '../utils';

const SubHeader = ({
  actionType,
  modalType,
  forTarget,
  kind,
  step,
  attributeType,
  attributeName,
  customFieldUid,
}) => {
  const { formatMessage } = useIntl();
  const customFielsRegistry = useCustomFields();

  if (customFieldUid) {
    const { intlLabel } = customFielsRegistry.get(customFieldUid);

    return (
      <Typography as="h2" variant="beta">
        {formatMessage(
          {
            id: getTrad(`modalForm.sub-header.attribute.${actionType}`),
            defaultMessage: 'Add new custom field',
          },
          {
            type: upperFirst(formatMessage(intlLabel)),
            name: upperFirst(attributeName),
          }
        )}
      </Typography>
    );
  }

  return (
    <Typography as="h2" variant="beta">
      {formatMessage(
        {
          id: getModalTitleSubHeader({
            actionType,
            forTarget,
            kind,
            step,
            modalType,
          }),
          defaultMessage: 'Add new field',
        },
        {
          type: upperFirst(
            formatMessage({
              id: getTrad(`attribute.${attributeType}`),
            })
          ),
          name: upperFirst(attributeName),
          step,
        }
      )}
    </Typography>
  );
};

SubHeader.defaultProps = {
  actionType: null,
  modalType: null,
  forTarget: null,
  kind: null,
  step: null,
  attributeType: null,
  attributeName: null,
  customFieldUid: null,
};

SubHeader.propTypes = {
  actionType: PropTypes.string,
  modalType: PropTypes.string,
  forTarget: PropTypes.string,
  kind: PropTypes.string,
  step: PropTypes.string,
  attributeType: PropTypes.string,
  attributeName: PropTypes.string,
  customFieldUid: PropTypes.string,
};

export default SubHeader;
