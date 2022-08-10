import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import upperFirst from 'lodash/upperFirst';
import { getTrad } from '../../utils';
import getModalTitleSubHeader from './getModalTitleSubHeader';

const FormModalSubHeader = ({
  actionType,
  modalType,
  forTarget,
  kind,
  step,
  attributeType,
  attributeName,
  customField,
}) => {
  const { formatMessage } = useIntl();

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
            formatMessage(customField?.intlLabel ?? { id: getTrad(`attribute.${attributeType}`) })
          ),
          name: upperFirst(attributeName),
          step,
        }
      )}
    </Typography>
  );
};

FormModalSubHeader.defaultProps = {
  actionType: null,
  modalType: null,
  forTarget: null,
  kind: null,
  step: null,
  attributeType: null,
  attributeName: null,
  customField: null,
};

FormModalSubHeader.propTypes = {
  actionType: PropTypes.string,
  modalType: PropTypes.string,
  forTarget: PropTypes.string,
  kind: PropTypes.string,
  step: PropTypes.string,
  attributeType: PropTypes.string,
  attributeName: PropTypes.string,
  customField: PropTypes.object,
};

export default FormModalSubHeader;
