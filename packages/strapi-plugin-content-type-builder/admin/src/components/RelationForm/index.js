import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty } from 'lodash';
import { useGlobalContext } from 'strapi-helper-plugin';
import RelationFormBox from '../RelationFormBox';
import RelationFormNaturePicker from '../RelationFormNaturePicker';
import Wrapper from './Wrapper';

const RelationForm = ({ errors, mainBoxHeader, modifiedData, onChange }) => {
  const { formatMessage } = useGlobalContext();
  const getError = name => {
    const errorId = get(errors, [name, 'id'], null);

    return isEmpty(errorId) ? null : formatMessage({ id: errorId });
  };

  return (
    <Wrapper>
      <RelationFormBox
        isMain
        header={mainBoxHeader}
        error={getError('name')}
        name="name"
        onChange={onChange}
        value={get(modifiedData, 'name', '')}
      />
      <RelationFormNaturePicker nature={modifiedData.nature} />
      <RelationFormBox
        disabled={modifiedData.nature === 'oneWay'}
        error={getError('targetAttribute')}
        name="targetAttribute"
        onChange={onChange}
        value={get(modifiedData, 'targetAttribute', '')}
      />
    </Wrapper>
  );
};

RelationForm.defaultProps = {
  errors: {},
  modifiedData: {},
};

RelationForm.propTypes = {
  errors: PropTypes.object,
  mainBoxHeader: PropTypes.string.isRequired,
  modifiedData: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

export default RelationForm;
