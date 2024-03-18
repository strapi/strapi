import * as React from 'react';

import { Button, Flex, PopoverPrimitives, Tag, useComposedRefs } from '@strapi/design-system';
import { useQueryParams } from '@strapi/helper-plugin';
import { Plus, Filter as FilterIcon, Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';

import {
  BASE_FILTERS,
  CONTAINS_FILTERS,
  FilterOption,
  IS_SENSITIVE_FILTERS,
  NUMERIC_FILTERS,
  STRING_PARSE_FILTERS,
} from '../constants/filters';
import { MainField } from '../content-manager/utils/attributes';
import { useControllableState } from '../hooks/useControllableState';

import { createContext } from './Context';
import { Form, InputProps } from './Form';
import { InputRenderer } from './FormInputs/Renderer';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

interface FilterFormData {
  name: string;
  filter: string;
  value?: string;
}

interface FitlersContextValue {
  disabled: boolean;
  onChange: (data: FilterFormData) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  setTriggerNode: (node: HTMLButtonElement | null) => void;
  triggerNode: HTMLButtonElement | null;
  options: Filters.Filter[];
}

const [FiltersProvider, useFilters] = createContext<FitlersContextValue>('Filters');

interface RootProps
  extends Partial<Pick<FitlersContextValue, 'disabled' | 'onChange' | 'options' | 'open'>> {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Root = ({
  children,
  disabled = false,
  onChange,
  onOpenChange,
  open: openProp,
  defaultOpen,
  options = [],
}: RootProps) => {
  const [triggerNode, setTriggerNode] = React.useState<FitlersContextValue['triggerNode']>(null);
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const handleChange = (data: FilterFormData) => {
    if (onChange) {
      onChange(data);
    }
  };

  return (
    <FiltersProvider
      disabled={disabled}
      onChange={handleChange}
      open={open}
      options={options}
      setOpen={setOpen}
      setTriggerNode={setTriggerNode}
      triggerNode={triggerNode}
    >
      {children}
    </FiltersProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

const Trigger = React.forwardRef<HTMLButtonElement, Filters.TriggerProps>(
  ({ label }, forwardedRef) => {
    const { formatMessage } = useIntl();
    const { setTriggerNode, setOpen } = useFilters('Trigger', ({ setTriggerNode, setOpen }) => ({
      setTriggerNode,
      setOpen,
    }));
    const disabled = useFilters('Trigger', ({ disabled }) => disabled);
    const open = useFilters('Trigger', ({ open }) => open);

    const composedRefs = useComposedRefs(forwardedRef, setTriggerNode);

    const handleClick = () => setOpen(!open);

    return (
      <Button
        variant="tertiary"
        ref={composedRefs}
        startIcon={<FilterIcon />}
        onClick={handleClick}
        size="S"
        disabled={disabled}
      >
        {label || formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
      </Button>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Popover
 * -----------------------------------------------------------------------------------------------*/

const PopoverImpl = () => {
  const [{ query }, setQuery] = useQueryParams<Filters.Query>();
  const { formatMessage } = useIntl();
  const open = useFilters('Popover', ({ open }) => open);
  const options = useFilters('Popover', ({ options }) => options);
  const triggerNode = useFilters('Popover', ({ triggerNode }) => triggerNode);
  const setOpen = useFilters('Popover', ({ setOpen }) => setOpen);
  const onChange = useFilters('Popover', ({ onChange }) => onChange);

  if (!open || options.length === 0 || !triggerNode) {
    return null;
  }

  const handleSubmit = (data: FilterFormData) => {
    if (!data.value) {
      return;
    }

    if (onChange) {
      onChange(data);
    }

    /**
     * There will ALWAYS be an option because we use the options to create the form data.
     */
    const filterType = options.find((filter) => filter.name === data.name)!.type;

    /**
     * If the filter is a relation, we need to nest the filter object,
     * we always use ids to filter relations. But the nested object is
     * the operator & value pair. This value _could_ look like:
     * ```json
     * {
     *  "$eq": "1",
     * }
     * ```
     */
    const operatorValuePairing = {
      [data.filter]: data.value,
    };

    const newFilterQuery = {
      ...query.filters,
      $and: [
        ...(query.filters?.$and ?? []),
        {
          [data.name]:
            filterType === 'relation'
              ? {
                  id: operatorValuePairing,
                }
              : operatorValuePairing,
        },
      ],
    };

    setQuery({ filters: newFilterQuery, page: 1 });
    setOpen(false);
  };

  return (
    <PopoverPrimitives.Content
      source={{ current: triggerNode }}
      onDismiss={() => setOpen(false)}
      padding={3}
      spacing={4}
      maxHeight="unset"
    >
      <Form
        method="POST"
        initialValues={
          {
            name: options[0]?.name,
            filter: BASE_FILTERS[0].value,
          } satisfies FilterFormData
        }
        onSubmit={handleSubmit}
      >
        {({ values: formValues, modified, isSubmitting }) => {
          const filter = options.find((filter) => filter.name === formValues.name);
          const Input = filter?.input || InputRenderer;
          return (
            <Flex direction="column" alignItems="stretch" gap={2} style={{ minWidth: 184 }}>
              {[
                {
                  ['aria-label']: formatMessage({
                    id: 'app.utils.select-field',
                    defaultMessage: 'Select field',
                  }),
                  name: 'name',
                  options: options.map((filter) => ({
                    label: filter.label,
                    value: filter.name,
                  })),
                  placholder: formatMessage({
                    id: 'app.utils.select-field',
                    defaultMessage: 'Select field',
                  }),
                  type: 'enumeration' as const,
                },
                {
                  ['aria-label']: formatMessage({
                    id: 'app.utils.select-filter',
                    defaultMessage: 'Select filter',
                  }),
                  name: 'filter',
                  options:
                    filter?.operators ||
                    getFilterList(filter).map((opt) => ({
                      label: formatMessage(opt.label),
                      value: opt.value,
                    })),
                  placeholder: formatMessage({
                    id: 'app.utils.select-filter',
                    defaultMessage: 'Select filter',
                  }),
                  type: 'enumeration' as const,
                },
              ].map((field) => (
                <InputRenderer key={field.name} {...field} />
              ))}
              {filter &&
              formValues.filter &&
              formValues.filter !== '$null' &&
              formValues.filter !== '$notNull' ? (
                <Input
                  {...filter}
                  label={null}
                  aria-label={filter.label}
                  name="value"
                  // @ts-expect-error – if type is `custom` then `Input` will be a custom component.
                  type={filter.mainField?.type ?? filter.type}
                />
              ) : null}
              <Button
                disabled={!modified || isSubmitting}
                size="L"
                variant="secondary"
                startIcon={<Plus />}
                type="submit"
                fullWidth
              >
                {formatMessage({ id: 'app.utils.add-filter', defaultMessage: 'Add filter' })}
              </Button>
            </Flex>
          );
        }}
      </Form>
    </PopoverPrimitives.Content>
  );
};

/**
 * Depending on the selected field find the possible filters to apply
 */
const getFilterList = (filter?: Filters.Filter): FilterOption[] => {
  if (!filter) {
    return [];
  }

  const type = filter.mainField?.type ? filter.mainField.type : filter.type;

  switch (type) {
    case 'email':
    case 'text':
    case 'enumeration':
    case 'string': {
      return [
        ...BASE_FILTERS,
        ...IS_SENSITIVE_FILTERS,
        ...CONTAINS_FILTERS,
        ...STRING_PARSE_FILTERS,
      ];
    }

    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal': {
      return [...BASE_FILTERS, ...NUMERIC_FILTERS];
    }
    case 'time':
    case 'date': {
      return [...BASE_FILTERS, ...NUMERIC_FILTERS, ...CONTAINS_FILTERS];
    }

    case 'datetime': {
      return [...BASE_FILTERS, ...NUMERIC_FILTERS];
    }

    default:
      return [...BASE_FILTERS, ...IS_SENSITIVE_FILTERS];
  }
};

/* -------------------------------------------------------------------------------------------------
 * List
 * -----------------------------------------------------------------------------------------------*/

const List = () => {
  const [{ query }, setQuery] = useQueryParams<Filters.Query>();

  const options = useFilters('List', ({ options }) => options);

  const handleClick = (data: FilterFormData) => {
    /**
     * Check the name, operator and value to see if it already exists in the query
     * if it does, remove it.
     */
    const nextFilters = (query?.filters?.$and ?? []).filter((filter) => {
      const [attributeName] = Object.keys(filter);
      if (attributeName !== data.name) {
        return true;
      }

      const { type, mainField } = options.find(({ name }) => name === attributeName)!;

      if (type === 'relation') {
        const filterObj = filter[attributeName][mainField?.name ?? 'id'];

        if (typeof filterObj === 'object') {
          const [operator] = Object.keys(filterObj);
          const value = filterObj[operator];

          return !(operator === data.filter && value === data.value);
        }

        return true;
      } else {
        const filterObj = filter[attributeName];
        const [operator] = Object.keys(filterObj);
        const value = filterObj[operator];

        return !(operator === data.filter && value === data.value);
      }
    });

    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  if (!query?.filters?.$and?.length) {
    return null;
  }

  return (
    <>
      {query?.filters?.$and?.map((queryFilter) => {
        const [attributeName] = Object.keys(queryFilter);
        const filter = options.find(({ name }) => name === attributeName);
        const filterObj = queryFilter[attributeName];

        if (!filter || typeof filterObj !== 'object' || filterObj === null) {
          return null;
        }

        if (filter.type === 'relation') {
          const modelFilter = filterObj[filter.mainField?.name ?? 'id'];

          if (typeof modelFilter === 'object') {
            const [operator] = Object.keys(modelFilter);
            const value = modelFilter[operator];
            return (
              <AttributeTag
                key={`${attributeName}-${operator}-${value}`}
                {...filter}
                onClick={handleClick}
                operator={operator}
                value={value}
              />
            );
          }

          return null;
        } else {
          const [operator] = Object.keys(filterObj);
          const value = filterObj[operator];

          /**
           * Something has gone wrong here, because the attribute is not a relation
           * but we have a nested filter object.
           */
          if (typeof value === 'object') {
            return null;
          }

          return (
            <AttributeTag
              key={`${attributeName}-${operator}-${value}`}
              {...filter}
              onClick={handleClick}
              operator={operator}
              value={value}
            />
          );
        }
      })}
    </>
  );
};

interface AttributeTagProps extends Filters.Filter {
  onClick: (data: FilterFormData) => void;
  operator: string;
  value: string;
}

const AttributeTag = ({
  input,
  label,
  mainField,
  name,
  onClick,
  operator,
  options,
  value,
  ...filter
}: AttributeTagProps) => {
  const { formatMessage, formatDate, formatTime, formatNumber } = useIntl();

  const handleClick = () => {
    onClick({ name, value, filter: operator });
  };

  const type = mainField?.type ? mainField.type : filter.type;

  let formattedValue: string = value;

  switch (type) {
    case 'date':
      formattedValue = formatDate(value, { dateStyle: 'full' });
      break;
    case 'datetime':
      formattedValue = formatDate(value, { dateStyle: 'full', timeStyle: 'short' });
      break;
    case 'time':
      const [hour, minute] = value.split(':');
      const date = new Date();
      date.setHours(Number(hour));
      date.setMinutes(Number(minute));

      formattedValue = formatTime(date, {
        hour: 'numeric',
        minute: 'numeric',
      });
      break;
    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal':
      formattedValue = formatNumber(Number(value));
      break;
  }

  // Handle custom input
  if (input && options) {
    // If the custom input has an options array, find the option with a customValue matching the query value
    const selectedOption = options.find((option) => {
      return (typeof option === 'string' ? option : option.value) === value;
    });

    formattedValue = selectedOption
      ? typeof selectedOption === 'string'
        ? selectedOption
        : selectedOption.label ?? selectedOption.value
      : value;
  }

  const content = `${label} ${formatMessage({
    id: `components.FilterOptions.FILTER_TYPES.${operator}`,
    defaultMessage: operator,
  })} ${operator !== '$null' && operator !== '$notNull' ? formattedValue : ''}`;

  return (
    <Tag padding={1} onClick={handleClick} icon={<Cross />}>
      {content}
    </Tag>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EXPORTS
 * -----------------------------------------------------------------------------------------------*/

const Filters = {
  List,
  Popover: PopoverImpl,
  Root,
  Trigger,
};

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Filters {
  export interface Filter {
    input?: React.ComponentType<ValueInputProps>;
    label: string;
    /**
     * the name of the attribute we use to display the actual name e.g. relations
     * are just ids, so we use the mainField to display something meaninginful by
     * looking at the target's schema
     */
    mainField?: MainField;
    name: string;
    operators?: Array<{
      label: string;
      value: string;
    }>;
    options?: Array<{ label?: string; value: string }> | string[];
    type: InputProps['type'] | 'relation' | 'custom';
  }

  export interface ValueInputProps extends Omit<Filter, 'label'> {
    ['aria-label']: string;
  }

  export type Props = RootProps;

  export interface TriggerProps {
    label?: string;
  }

  export interface Query {
    filters?: {
      /**
       * Typically, a filter will be:
       * ```ts
       * {
       *  [attributeName]: {
       *    [operator]: value
       *  }
       * }
       * ```
       * However, for relation items it becomes more nested.
       * ```ts
       * {
       *  [attributeName]: {
       *    [relationTargetAttribute]: {
       *     [operator]: value
       *    }
       *  }
       * }
       */
      $and?: Array<Record<string, Record<string, string | Record<string, string>>>>;
    };
    page?: number;
  }
}

export { Filters };
