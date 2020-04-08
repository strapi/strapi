import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, truncate } from 'lodash';
import pluralize from 'pluralize';
import useDataManager from '../../hooks/useDataManager';
import ManyToMany from '../../icons/ManyToMany';
import ManyToOne from '../../icons/ManyToOne';
import ManyWay from '../../icons/ManyWay';
import OneToMany from '../../icons/OneToMany';
import OneToOne from '../../icons/OneToOne';
import OneWay from '../../icons/OneWay';
import getTrad from '../../utils/getTrad';
import Wrapper from './Wrapper';

const relations = {
  oneWay: OneWay,
  oneToOne: OneToOne,
  oneToMany: OneToMany,
  manyToOne: ManyToOne,
  manyToMany: ManyToMany,
  manyWay: ManyWay,
};

const RelationFormNaturePicker = ({
  nature,
  naturePickerType,
  onChange,
  oneThatIsCreatingARelationWithAnother,
  target,
}) => {
  const { contentTypes, modifiedData } = useDataManager();
  const ctRelations = [
    'oneWay',
    'oneToOne',
    'oneToMany',
    'manyToOne',
    'manyToMany',
    'manyWay',
  ];
  const componentRelations = ['oneWay', 'manyWay'];
  const dataType =
    naturePickerType === 'contentType'
      ? get(modifiedData, [naturePickerType, 'schema', 'kind'], '')
      : naturePickerType;
  const relationsType =
    dataType === 'collectionType' ? ctRelations : componentRelations;

  const areDisplayedNamesInverted = nature === 'manyToOne';
  const targetLabel = get(contentTypes, [target, 'schema', 'name'], 'unknown');
  const leftTarget = areDisplayedNamesInverted
    ? targetLabel
    : oneThatIsCreatingARelationWithAnother;
  const rightTarget = areDisplayedNamesInverted
    ? oneThatIsCreatingARelationWithAnother
    : targetLabel;
  const leftDisplayedValue = pluralize(
    leftTarget,
    nature === 'manyToMany' ? 2 : 1
  );

  const rightDisplayedValue = pluralize(
    rightTarget,
    ['manyToMany', 'oneToMany', 'manyToOne', 'manyWay'].includes(nature) ? 2 : 1
  );

  return (
    <Wrapper>
      <div className="nature-container">
        <div className="nature-buttons">
          {relationsType.map(relationNature => {
            const Asset = relations[relationNature];

            return (
              <Asset
                key={relationNature}
                isSelected={nature === relationNature}
                onClick={() => {
                  onChange({
                    target: {
                      name: 'nature',
                      value: relationNature,
                      targetContentType: target,
                      oneThatIsCreatingARelationWithAnother,
                      type: 'relation',
                    },
                  });
                }}
              />
            );
          })}
        </div>
        <div className="nature-txt">
          <span>{truncate(leftDisplayedValue, { length: 24 })}</span>
          &nbsp;
          <FormattedMessage id={getTrad(`relation.${nature}`)} />
          &nbsp;
          <span>{truncate(rightDisplayedValue, { length: 24 })}</span>
        </div>
      </div>
    </Wrapper>
  );
};

RelationFormNaturePicker.defaultProps = {
  nature: 'oneWay',
};

RelationFormNaturePicker.propTypes = {
  nature: PropTypes.string,
  naturePickerType: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  oneThatIsCreatingARelationWithAnother: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
};

export default RelationFormNaturePicker;
