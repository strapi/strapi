import { Field, Grid, NumberInput, SingleSelect, SingleSelectOption, Toggle } from '@strapi/design-system';
import React, { ReactNode, useContext } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { GroupAndArrangeContext } from '../GroupAndArrangeContextProvider';
import { GridDirection } from '../../../../shared/types';

const GridItem = ({ children }: { children: React.ReactNode }) => (
  <Grid.Item xs={12} s={6} m={4}>{children}</Grid.Item>
);

interface SelectFieldFieldProps {
  chosenField: string | null | undefined;
  setChosenField: (newValue: string) => void;
  attributeNames: string[];
  hintContent: string | ReactNode;
  labelContent: string | ReactNode;
  placeholderContent: string | ReactNode;
  emptyItemContent: string | ReactNode | null;
}

const SelectFieldField = (props: SelectFieldFieldProps) => {
  const {
    chosenField,
    setChosenField,
    attributeNames,
    hintContent,
    labelContent,
    placeholderContent,
    emptyItemContent
  } = props

  return (
    <Field.Root
      hint={hintContent}
      width="100%">
      <Field.Label>
        {labelContent}
      </Field.Label>
      <SingleSelect
        placeholder={placeholderContent}
        value={chosenField || ''}
        onChange={s => setChosenField(s.toString())}
      >
        {attributeNames.concat(emptyItemContent ? [''] : []).map((attributeName) => (
          <SingleSelectOption
            key={attributeName}
            value={attributeName}>
            {attributeName || emptyItemContent}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Field.Hint />
    </Field.Root>);
}

interface SelectFieldProps {
  value: string | null | undefined;
  setValue: (newValue: string) => void;
  options: Record<string, string>;
  hintContent: string | ReactNode;
  labelContent: string | ReactNode;
  placeholderContent: string | ReactNode;
  emptyItemContent?: string | ReactNode | null;
}

const SelectField = (props: SelectFieldProps) => {
  const {
    value,
    setValue,
    options,
    hintContent,
    labelContent,
    placeholderContent,
    emptyItemContent
  } = props

  return (
    <Field.Root
      hint={hintContent}
      width="100%">
      <Field.Label>
        {labelContent}
      </Field.Label>
      <SingleSelect
        placeholder={placeholderContent}
        value={value || ''}
        onChange={s => setValue(s.toString())}
      >
        {options && Object.keys(options).concat(emptyItemContent ? [''] : []).map((option) => (
          <SingleSelectOption
            key={option}
            value={option}>
            {options[option] || emptyItemContent}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Field.Hint />
    </Field.Root>);
}

interface NumberFieldProps {
  value: number | undefined;
  setValue: (newValue: number | undefined) => void;
  hintContent: string | ReactNode;
  labelContent: string | ReactNode;
  placeholderContent: string;
}

const NumberField = (props: NumberFieldProps) => {
  const {
    value,
    setValue,
    hintContent,
    labelContent,
    placeholderContent
  } = props;

  return (
    <Field.Root
      hint={hintContent}
      width="100%">
      <Field.Label>
        {labelContent}
      </Field.Label>
      <NumberInput
        value={value}
        onValueChange={setValue}
        placeholder={placeholderContent}
      />
      <Field.Hint />
    </Field.Root>);
}

/**
 * UserSettings component, used in ArrangePage to display user settings for the plugin: chosen media and title fields, row height for 2d order
 */
export const UserSettings = () => {
  const { formatMessage } = useTranslation();
  const { chosenMediaField, chosenTitleField, chosenDirection, mediaAttributeNames, titleAttributeNames, localConfig, currentAttribute, setLocalConfig, setChosenDirection } = useContext(GroupAndArrangeContext);

  const emptyItemContent = formatMessage({
    id: 'arrange.empty-item',
    defaultMessage: '<Empty>',
  });

  return (
    <Grid.Root gap={4}>
      <GridItem>
        <SelectFieldField
          chosenField={chosenMediaField}
          setChosenField={(value) => {
            setLocalConfig({
              ...localConfig!,
              chosenMediaField: value
            });
          }}
          attributeNames={mediaAttributeNames}
          hintContent={formatMessage({
            id: 'arrange.media-select.hint',
            defaultMessage: 'Option controls what media field will be displayed as items preview in the group. Only affects the current user.',
          })}
          labelContent={formatMessage({
            id: 'arrange.media-select.label',
            defaultMessage: 'Media field to display',
          })}
          placeholderContent={formatMessage({
            id: 'arrange.media-select.placeholder',
            defaultMessage: 'Choose media field',
          })}
          emptyItemContent={emptyItemContent}
        />
      </GridItem>
      <GridItem>
        <SelectFieldField
          chosenField={chosenTitleField}
          setChosenField={(value) => {
            setLocalConfig({
              ...localConfig!,
              chosenTitleField: value
            });
          }}
          attributeNames={titleAttributeNames}
          hintContent={formatMessage({
            id: 'arrange.title-select.hint',
            defaultMessage: 'Option controls what text field will be used to display titles. Only affects the current user.',
          })}
          labelContent={formatMessage({
            id: 'arrange.title-select.label',
            defaultMessage: 'Title field to display',
          })}
          placeholderContent={formatMessage({
            id: 'arrange.title-select.placeholder',
            defaultMessage: 'Choose title field',
          })}
          emptyItemContent={emptyItemContent}
        />
      </GridItem>
      <GridItem>
        <SelectFieldField
          chosenField={localConfig?.chosenSubtitleField}
          setChosenField={(value) => {
            setLocalConfig({
              ...localConfig!,
              chosenSubtitleField: value
            });
          }}
          attributeNames={titleAttributeNames}
          hintContent={formatMessage({
            id: 'arrange.subtitle-select.hint',
            defaultMessage: 'Option controls what text field will be used to display subtitles. Only affects the current user.',
          })}
          labelContent={formatMessage({
            id: 'arrange.subtitle-select.label',
            defaultMessage: 'Subtitle field to display',
          })}
          placeholderContent={formatMessage({
            id: 'arrange.subtitle-select.placeholder',
            defaultMessage: 'Choose subtitle field',
          })}
          emptyItemContent={emptyItemContent}
        />
      </GridItem>
      {currentAttribute?.order === '2d' &&
        <GridItem>
          <NumberField
            value={localConfig?.rowHeight2d || 32}
            setValue={value => {
              setLocalConfig({
                ...localConfig!,
                rowHeight2d: value!
              });
            }}
            hintContent={formatMessage({
              id: 'arrange.row-height-2d.hint',
              defaultMessage: 'Controls visual display of rows in the group. Only affects the current user.',
            })}
            labelContent={formatMessage({
              id: 'arrange.row-height-2d.label',
              defaultMessage: 'Row height, px',
            })}
            placeholderContent={formatMessage({
              id: 'arrange.row-height-2d.placeholder',
              defaultMessage: 'Choose row height, px'
            })}
          />
        </GridItem>
      }
      {currentAttribute?.order === '2d' &&
        <GridItem>
          <SelectField
            value={chosenDirection}
            setValue={x => setChosenDirection((x || null) as GridDirection)}
            options={{
              horizontal: formatMessage({
                id: 'arrange.direction.horizontal',
                defaultMessage: 'Horizontal'
              }),
              vertical: formatMessage({
                id: 'arrange.direction.vertical',
                defaultMessage: 'Vertical'
              })
            }}
            hintContent={formatMessage({
              id: 'arrange.direction.hint',
              defaultMessage: 'Controls the direction where items will stick to. Only affects the current session.',
            })}
            labelContent={formatMessage({
              id: 'arrange.direction.label',
              defaultMessage: 'Direction'
            })}
            placeholderContent={formatMessage({
              id: 'arrange.direction.placeholder',
              defaultMessage: 'Choose direction'
            })}
            emptyItemContent={formatMessage({
              id: 'arrange.direction.none',
              defaultMessage: '<None>'
            })}
          />
        </GridItem>
      }
      {currentAttribute?.order === 'multiline' &&
        <GridItem>
          <NumberField
            value={localConfig?.rowHeightMultilineRem || 16}
            setValue={value => {
              setLocalConfig({
                ...localConfig!,
                rowHeightMultilineRem: value!
              });
            }}
            hintContent={formatMessage({
              id: 'arrange.row-height-multiline-rem.hint',
              defaultMessage: 'Controls visual display of rows in the group. Only affects the current user.',
            })}
            labelContent={formatMessage({
              id: 'arrange.row-height-multiline-rem.label',
              defaultMessage: 'Row height, rem',
            })}
            placeholderContent={formatMessage({
              id: 'arrange.row-height-multiline-rem.placeholder',
              defaultMessage: 'Choose row height, rem'
            })}
          />
        </GridItem>
      }
      {currentAttribute?.order === 'multiline' &&
        <GridItem>
          <NumberField
            value={localConfig?.multilineUnsortedColumns || 12}
            setValue={value => {
              setLocalConfig({
                ...localConfig!,
                multilineUnsortedColumns: Math.max(1, Math.min(50, value!))
              });
            }}
            hintContent={formatMessage({
              id: 'arrange.multiline-unsorted-columns.hint',
              defaultMessage: 'Controls the number of columns for unsorted items. Only affects the current user.',
            })}
            labelContent={formatMessage({
              id: 'arrange.multiline-unsorted-columns.label',
              defaultMessage: 'Unsorted columns count',
            })}
            placeholderContent={formatMessage({
              id: 'arrange.multiline-unsorted-columns.placeholder',
              defaultMessage: 'Choose unsorted columns count'
            })}
          />
        </GridItem>
      }
      {currentAttribute?.order === 'multiline' &&
        <GridItem>
          <SelectField
            value={localConfig?.multilineShowUnsortedOnTop ? 'top' : 'bottom'}
            setValue={x => {
              setLocalConfig({
                ...localConfig!,
                multilineShowUnsortedOnTop: x === 'top'
              });
            }}
            options={{
              top: formatMessage({
                id: 'arrange.multiline-show-unsorted-on-top.top',
                defaultMessage: 'Top'
              }),
              bottom: formatMessage({
                id: 'arrange.multiline-show-unsorted-on-top.bottom',
                defaultMessage: 'Bottom'
              })
            }}
            hintContent={formatMessage({
              id: 'arrange.multiline-show-unsorted-on-top.hint',
              defaultMessage: 'Controls the position of unsorted items. Only affects the current user.',
            })}
            labelContent={formatMessage({
              id: 'arrange.multiline-show-unsorted-on-top.label',
              defaultMessage: 'Show unsorted on'
            })}
            placeholderContent={formatMessage({
              id: 'arrange.multiline-show-unsorted-on-top.placeholder',
              defaultMessage: 'Choose position'
            })}
          />
        </GridItem>
      }
    </Grid.Root>
  );
};