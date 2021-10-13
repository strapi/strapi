/**
 *
 * Relation
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import getRelationType from '../../utils/getRelationType';
import getTrad from '../../utils/getTrad';
import RelationField from './RelationField';
import RelationNaturePicker from './RelationNaturePicker';

const Relation = ({ formErrors, mainBoxHeader, modifiedData, naturePickerType, onChange }) => {
  const relationType = getRelationType(modifiedData.relation, modifiedData.targetAttribute);

  return (
    <Row>
      <RelationField
        isMain
        header={mainBoxHeader}
        error={formErrors?.name || null}
        name="name"
        onChange={onChange}
        value={modifiedData?.name || ''}
      />
      <RelationNaturePicker
        naturePickerType={naturePickerType}
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        relationType={relationType}
        target={modifiedData.target}
      />
      <RelationField
        disabled={['oneWay', 'manyWay'].includes(relationType)}
        error={formErrors?.targetAttribute || null}
        name="targetAttribute"
        onChange={onChange}
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        target={modifiedData.target}
        value={modifiedData?.targetAttribute || ''}
      />
    </Row>
  );
};

Relation.propTypes = {
  formErrors: PropTypes.object.isRequired,
  mainBoxHeader: PropTypes.string.isRequired,
  modifiedData: PropTypes.object.isRequired,
  naturePickerType: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Relation;
