import { Flex, KeyboardNavigable, Typography } from '@strapi/design-system';
import {
  ManyToMany,
  ManyToOne,
  ManyWays as ManyWay,
  OneToMany,
  OneToOne,
  OneWay,
} from '@strapi/icons';
import get from 'lodash/get';
import truncate from 'lodash/truncate';
import pluralize from 'pluralize';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { useDataManager } from '../../../hooks/useDataManager';
import { getTrad } from '../../../utils/getTrad';
import { ON_CHANGE_RELATION_TYPE } from '../../FormModal/constants';

import { IconWrapper, InfosWrapper, Wrapper } from './Components';

const relations = {
  oneWay: OneWay,
  oneToOne: OneToOne,
  oneToMany: OneToMany,
  manyToOne: ManyToOne,
  manyToMany: ManyToMany,
  manyWay: ManyWay,
};

type RelationType = keyof typeof relations;

interface RelationNaturePickerProps {
  naturePickerType: string;
  oneThatIsCreatingARelationWithAnother: string;
  relationType: string;
  target: string;
}

export const RelationNaturePicker = ({
  naturePickerType,
  oneThatIsCreatingARelationWithAnother,
  relationType,
  target,
}: RelationNaturePickerProps) => {
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();

  const { contentTypes, modifiedData } = useDataManager();
  const ctRelations = ['oneWay', 'oneToOne', 'oneToMany', 'manyToOne', 'manyToMany', 'manyWay'];
  const componentRelations = ['oneWay', 'manyWay'];
  const dataType =
    naturePickerType === 'contentType'
      ? get(modifiedData, [naturePickerType, 'schema', 'kind'], '')
      : naturePickerType;
  const relationsType = (
    dataType === 'collectionType' ? ctRelations : componentRelations
  ) as RelationType[];

  const areDisplayedNamesInverted = relationType === 'manyToOne';
  const targetLabel = get(contentTypes, [target, 'schema', 'displayName'], 'unknown');
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

  if (!relationType) {
    return null;
  }

  return (
    <Flex style={{ flex: 1 }}>
      <Wrapper>
        <Flex paddingLeft={9} paddingRight={9} paddingTop={1} justifyContent="center">
          <KeyboardNavigable tagName="button">
            <Flex gap={3}>
              {relationsType.map((relation) => {
                const Asset = relations[relation];
                const isEnabled =
                  restrictedRelations === null || restrictedRelations.includes(relation);

                return (
                  <IconWrapper
                    tag="button"
                    $isSelected={relationType === relation}
                    disabled={!isEnabled}
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
            </Flex>
          </KeyboardNavigable>
        </Flex>
      </Wrapper>
      <InfosWrapper justifyContent="center">
        <Typography>{truncate(leftDisplayedValue, { length: 24 })}&nbsp;</Typography>
        <Typography textColor="primary600">
          {formatMessage({ id: getTrad(`relation.${relationType}`) })}&nbsp;
        </Typography>
        <Typography>{truncate(rightDisplayedValue, { length: 24 })}</Typography>
      </InfosWrapper>
    </Flex>
  );
};
