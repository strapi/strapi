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

import { getTrad } from '../../../utils/getTrad';
import { useDataManager } from '../../DataManager/useDataManager';
import { actions } from '../../FormModal/reducer';

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
  targetUid: string;
}

const ctRelations = ['oneWay', 'oneToOne', 'oneToMany', 'manyToOne', 'manyToMany', 'manyWay'];
const componentRelations = ['oneWay', 'manyWay'];

export const RelationNaturePicker = ({
  naturePickerType,
  oneThatIsCreatingARelationWithAnother,
  relationType,
  target,
  targetUid,
}: RelationNaturePickerProps) => {
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();

  const { contentTypes } = useDataManager();

  const dataType =
    naturePickerType === 'component' ? 'component' : get(contentTypes, [targetUid, 'kind'], '');

  const relationsType = (
    dataType === 'collectionType' ? ctRelations : componentRelations
  ) as RelationType[];

  const areDisplayedNamesInverted = relationType === 'manyToOne';
  const targetLabel = get(contentTypes, [target, 'info', 'displayName'], 'unknown');
  const leftTarget = areDisplayedNamesInverted
    ? targetLabel
    : oneThatIsCreatingARelationWithAnother;
  const rightTarget = areDisplayedNamesInverted
    ? oneThatIsCreatingARelationWithAnother
    : targetLabel;
  const leftDisplayedValue = pluralize(leftTarget, relationType === 'manyToMany' ? 2 : 1);
  const restrictedRelations = get(contentTypes, [target, 'restrictRelationsTo'], null);

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
                        dispatch(
                          actions.onChangeRelationType({
                            target: {
                              oneThatIsCreatingARelationWithAnother,
                              value: relation,
                            },
                          })
                        );
                      }
                    }}
                    padding={2}
                    type="button"
                    aria-label={formatMessage({ id: getTrad(`relation.${relation}`) })}
                    aria-pressed={relationType === relation}
                    data-relation-type={relation}
                  >
                    <Asset key={relation} aria-hidden="true" />
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
