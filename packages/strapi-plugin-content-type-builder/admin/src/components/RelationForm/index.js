import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty } from 'lodash';
import { useGlobalContext } from 'strapi-helper-plugin';
import RelationFormBox from '../RelationFormBox';
import RelationFormNaturePicker from '../RelationFormNaturePicker';
import Wrapper from './Wrapper';

const RelationForm = ({
  errors,
  mainBoxHeader,
  modifiedData,
  naturePickerType,
  onChange,
}) => {
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
      <RelationFormNaturePicker
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        target={modifiedData.target}
        nature={modifiedData.nature}
        naturePickerType={naturePickerType}
        onChange={onChange}
      />
      <RelationFormBox
        disabled={['oneWay', 'manyWay'].includes(modifiedData.nature)}
        error={getError('targetAttribute')}
        name="targetAttribute"
        onChange={onChange}
        oneThatIsCreatingARelationWithAnother={mainBoxHeader}
        target={modifiedData.target}
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
  naturePickerType: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default RelationForm;
