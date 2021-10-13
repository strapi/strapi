import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import truncate from 'lodash/truncate';
import pluralize from 'pluralize';
import OneToOne from '@strapi/icons/IconRelation11';
import OneWay from '@strapi/icons/IconRelationUnidirectional11';
import ManyWay from '@strapi/icons/IconRelationUnidirectional1N';
import OneToMany from '@strapi/icons/IconRelation1N';
import ManyToOne from '@strapi/icons/IconRelationN1';
import ManyToMany from '@strapi/icons/IconRelationNN';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';

import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { Stack } from '@strapi/parts/Stack';
import useDataManager from '../../../hooks/useDataManager';
import { ON_CHANGE_RELATION_TYPE } from '../../FormModal/constants';
import getTrad from '../../../utils/getTrad';
import { IconWrapper, Wrapper } from './components';

const relations = {
  oneWay: OneWay,
  oneToOne: OneToOne,
  oneToMany: OneToMany,
  manyToOne: ManyToOne,
  manyToMany: ManyToMany,
  manyWay: ManyWay,
};

const RelationNaturePicker = ({
  naturePickerType,
  oneThatIsCreatingARelationWithAnother,
  relationType,
  target,
}) => {
  const dispatch = useDispatch();

  const { contentTypes, modifiedData } = useDataManager();
  const ctRelations = ['oneWay', 'oneToOne', 'oneToMany', 'manyToOne', 'manyToMany', 'manyWay'];
  const componentRelations = ['oneWay', 'manyWay'];
  const dataType =
    naturePickerType === 'contentType'
      ? get(modifiedData, [naturePickerType, 'schema', 'kind'], '')
      : naturePickerType;
  const relationsType = dataType === 'collectionType' ? ctRelations : componentRelations;

  const areDisplayedNamesInverted = relationType === 'manyToOne';
  const targetLabel = get(contentTypes, [target, 'schema', 'name'], 'unknown');
  const leftTarget = areDisplayedNamesInverted
    ? targetLabel
    : oneThatIsCreatingARelationWithAnother;
  const rightTarget = areDisplayedNamesInverted
    ? oneThatIsCreatingARelationWithAnother
    : targetLabel;
  const leftDisplayedValue = pluralize(leftTarget, relationType === 'manyToMany' ? 2 : 1);
  const restrictedRelations = get(contentTypes, [target, 'schema', 'restrictRelationsTo'], null);

  const rightDisplayedValue = pluralize(
    rightTarget,
    ['manyToMany', 'oneToMany', 'manyToOne', 'manyWay'].includes(relationType) ? 2 : 1
  );

  return (
    <Wrapper>
      <div>
        <Row paddingLeft={9} paddingRight={9} paddingTop={8}>
          <KeyboardNavigable tagName="button">
            <Stack size={3} horizontal>
              {relationsType.map(relation => {
                const Asset = relations[relation];
                const isEnabled =
                  restrictedRelations === null || restrictedRelations.includes(relation);

                return (
                  <IconWrapper
                    as="button"
                    isSelected={relationType === relation}
                    key={relation}
                    onClick={() => {
                      if (isEnabled) {
                        dispatch({
                          type: ON_CHANGE_RELATION_TYPE,
                          target: {
                            oneThatIsCreatingARelationWithAnother,
                            targetContentType: target,
                            value: relation,
                          },
                        });
                      }
                    }}
                    padding={2}
                    type="button"
                  >
                    <Asset key={relation} />
                  </IconWrapper>
                );
              })}
            </Stack>
          </KeyboardNavigable>
        </Row>
        <Row paddingTop={6}>
          <Text>ll</Text>
        </Row>
      </div>
    </Wrapper>
  );

  // return (
  //   <Wrapper>
  //     <div className="nature-container">
  //       <div className="nature-buttons">
  //         {relationsType.map(relation => {
  //           const Asset = relations[relation];
  //           const isEnabled =
  //             restrictedRelations === null || restrictedRelations.includes(relation);

  //           return (
  //             <Asset
  //               key={relation}
  //               isSelected={relationType === relation}
  //               style={{ cursor: isEnabled ? 'pointer' : 'not-allowed' }}
  // onClick={() => {
  //   if (isEnabled) {
  //     dispatch({
  //       type: ON_CHANGE_RELATION_TYPE,
  //       target: {
  //         oneThatIsCreatingARelationWithAnother,
  //         targetContentType: target,
  //         value: relation,
  //       },
  //     });
  //   }
  // }}
  //             />
  //           );
  //         })}
  //       </div>
  //       <div className="nature-txt">
  //         <span>{truncate(leftDisplayedValue, { length: 24 })}</span>
  //         &nbsp;
  //         <FormattedMessage id={getTrad(`relation.${relationType}`)} />
  //         &nbsp;
  //         <span>{truncate(rightDisplayedValue, { length: 24 })}</span>
  //       </div>
  //     </div>
  //   </Wrapper>
  // );
};

RelationNaturePicker.propTypes = {
  naturePickerType: PropTypes.string.isRequired,
  oneThatIsCreatingARelationWithAnother: PropTypes.string.isRequired,
  relationType: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
};

export default RelationNaturePicker;
