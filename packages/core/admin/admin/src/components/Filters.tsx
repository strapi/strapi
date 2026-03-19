import * as React from 'react';

import { Box, Button, Flex, Popover, Tag } from '@strapi/design-system';
import { Plus, Filter as FilterIcon, Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';

import {
  BASE_FILTERS,
  CONTAINS_FILTERS,
  FilterOption,
  IS_SENSITIVE_FILTERS,
  NUMERIC_FILTERS,
  STRING_PARSE_FILTERS,
  FILTERS_WITH_NO_VALUE,
} from '../constants/filters';
import { useControllableState } from '../hooks/useControllableState';
import { useQueryParams } from '../hooks/useQueryParams';

import { createContext } from './Context';
import { Form, InputProps } from './Form';
import { InputRenderer } from './FormInputs/Renderer';

import type { Schema } from '@strapi/types';

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
  options: Filters.Filter[];
  setOpen: (open: boolean) => void;
  editingFilter: FilterFormData | null;
  setEditingFilter: (filter: FilterFormData | null) => void;
}

const [FiltersProvider, useFilters] = createContext<FitlersContextValue>('Filters');

const getFilterDetails = (
  filterEntry: Record<string, unknown>,
  options: Filters.Filter[]
): { name: string; operator: string; value: unknown } | null => {
  const [name] = Object.keys(filterEntry);
  const option = options.find((o) => o.name === name);
  if (!option) {
    return null;
  }

  const operatorObj =
    option.type === 'relation'
      ? (filterEntry[name] as Record<string, unknown>)?.[option.mainField?.name ?? 'id']
      : filterEntry[name];

  if (typeof operatorObj !== 'object' || operatorObj === null) {
    return null;
  }

  const [operator] = Object.keys(operatorObj as Record<string, unknown>);
  if (!operator) {
    return null;
  }

  return { name, operator, value: (operatorObj as Record<string, unknown>)[operator] };
};

const isFilterMatch = (
  filterEntry: Record<string, unknown>,
  options: Filters.Filter[],
  target: FilterFormData
): boolean => {
  const details = getFilterDetails(filterEntry, options);
  if (!details || details.name !== target.name || details.operator !== target.filter) {
    return false;
  }
  if (FILTERS_WITH_NO_VALUE.includes(target.filter)) {
    return true;
  }

  const decoded =
    typeof details.value === 'string' ? decodeURIComponent(details.value) : details.value;
  return decoded === target.value;
};

interface RootProps
  extends Partial<Pick<FitlersContextValue, 'disabled' | 'onChange' | 'options'>>,
    Popover.Props {
  children: React.ReactNode;
}

const Root = ({
  children,
  disabled = false,
  onChange,
  options = [],
  onOpenChange,
  open: openProp,
  defaultOpen,
  ...restProps
}: RootProps) => {
  const [editingFilter, setEditingFilter] = React.useState<FilterFormData | null>(null);

  const handleChange = (data: FilterFormData) => {
    if (onChange) {
      onChange(data);
    }
  };

  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  React.useEffect(() => {
    if (!open) {
      setEditingFilter(null);
    }
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen} {...restProps}>
      <FiltersProvider
        setOpen={setOpen}
        disabled={disabled}
        onChange={handleChange}
        options={options}
        editingFilter={editingFilter}
        setEditingFilter={setEditingFilter}
      >
        {children}
      </FiltersProvider>
    </Popover.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

const Trigger = React.forwardRef<HTMLButtonElement, Filters.TriggerProps>(
  ({ label }, forwardedRef) => {
    const { formatMessage } = useIntl();
    const disabled = useFilters('Trigger', ({ disabled }) => disabled);

    return (
      <Popover.Trigger>
        <Button
          variant="tertiary"
          ref={forwardedRef}
          startIcon={<FilterIcon />}
          size="S"
          disabled={disabled}
        >
          {label || formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
        </Button>
      </Popover.Trigger>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Popover
 * -----------------------------------------------------------------------------------------------*/
/**
 * The zIndex property is used to override the zIndex of the Portal element of the Popover.
 * This is needed to ensure that the DatePicker is rendered above the Popover when opened.
 * The issue was that both the DatePicker and the Popover are rendered in a Portal and have the same zIndex.
 * On init, since the DatePicker is rendered before the Popover in the DOM,
 * it's causing the issue of appearing behind the Popover.
 */
const PopoverImpl = ({ zIndex }: { zIndex?: number }) => {
  const [{ query }, setQuery] = useQueryParams<Filters.Query>();
  const { formatMessage } = useIntl();
  const options = useFilters('Popover', ({ options }) => options);
  const onChange = useFilters('Popover', ({ onChange }) => onChange);
  const setOpen = useFilters('Popover', ({ setOpen }) => setOpen);
  const editingFilter = useFilters('Popover', ({ editingFilter }) => editingFilter);
  const setEditingFilter = useFilters('Popover', ({ setEditingFilter }) => setEditingFilter);

  const initialValues = React.useMemo(() => {
    return editingFilter ?? { name: options[0]?.name, filter: BASE_FILTERS[0].value };
  }, [editingFilter, options]);

  if (options.length === 0) {
    return null;
  }

  const handleSubmit = (data: FilterFormData) => {
    const value = FILTERS_WITH_NO_VALUE.includes(data.filter)
      ? 'true'
      : encodeURIComponent(data.value ?? '');

    if (!value) {
      return;
    }

    if (onChange) {
      onChange(data);
    }

    /**
     * There will ALWAYS be an option because we use the options to create the form data.
     */
    const fieldOptions = options.find((filter) => filter.name === data.name)!;

    /**
     * If the filter is a relation, we need to nest the filter object,
     * we filter based on the mainField of the relation, if there is no mainField, we use the id.
     * At the end, we pass the operator & value. This value _could_ look like:
     * ```json
     * {
     *  "$eq": "1",
     * }
     * ```
     */
    const operatorValuePairing = {
      [data.filter]: value,
    };

    const newFilterEntry = {
      [data.name]:
        fieldOptions.type === 'relation'
          ? {
              [fieldOptions.mainField?.name ?? 'id']: operatorValuePairing,
            }
          : operatorValuePairing,
    };

    const existingFilters = query.filters?.$and ?? [];

    const newFilterQuery = editingFilter
      ? {
          ...query.filters,
          $and: existingFilters.map((filter) =>
            isFilterMatch(filter, options, editingFilter) ? newFilterEntry : filter
          ),
        }
      : {
          ...query.filters,
          $and: [...existingFilters, newFilterEntry],
        };

    setQuery({ filters: newFilterQuery, page: 1 }, 'push', true);
    setOpen(false);
    setEditingFilter(null);
  };

  return (
    <Popover.Content style={{ zIndex }}>
      <Box padding={3}>
        <Form
          method="POST"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          key={
            editingFilter
              ? `edit-${editingFilter.name}-${editingFilter.filter}-${editingFilter.value ?? 'empty'}`
              : 'create'
          }
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
                !FILTERS_WITH_NO_VALUE.includes(formValues.filter) ? (
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
                  {editingFilter
                    ? formatMessage({
                        id: 'app.utils.update-filter',
                        defaultMessage: 'Update filter',
                      })
                    : formatMessage({ id: 'app.utils.add-filter', defaultMessage: 'Add filter' })}
                </Button>
              </Flex>
            );
          }}
        </Form>
      </Box>
    </Popover.Content>
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

    case 'enumeration': {
      return BASE_FILTERS;
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
      const details = getFilterDetails(filter, options);
      if (!details) {
        return true;
      }

      return !(
        details.name === data.name &&
        details.operator === data.filter &&
        details.value === data.value
      );
    });

    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  if (!query?.filters?.$and?.length) {
    return null;
  }

  return (
    <>
      {query?.filters?.$and?.map((queryFilter) => {
        const details = getFilterDetails(queryFilter, options);
        if (!details || typeof details.value === 'object') {
          return null;
        }

        const filter = options.find(({ name }) => name === details.name);
        if (!filter) {
          return null;
        }
        return (
          <AttributeTag
            key={`${details.name}-${details.operator}-${details.value}`}
            {...filter}
            onRemove={handleClick}
            operator={details.operator}
            value={String(details.value)}
          />
        );
      })}
    </>
  );
};

interface AttributeTagProps extends Filters.Filter {
  onRemove: (data: FilterFormData) => void;
  operator: string;
  value: string;
}

const AttributeTag = ({
  input,
  label,
  mainField,
  name,
  onRemove,
  operator,
  options,
  value,
  ...filter
}: AttributeTagProps) => {
  const { formatMessage, formatDate, formatTime, formatNumber } = useIntl();
  const setOpen = useFilters('AttributeTag', ({ setOpen }) => setOpen);
  const setEditingFilter = useFilters('AttributeTag', ({ setEditingFilter }) => setEditingFilter);

  const handleEdit = () => {
    setEditingFilter({
      name,
      filter: operator,
      value: FILTERS_WITH_NO_VALUE.includes(operator) ? undefined : decodeURIComponent(value),
    });
    setOpen(true);
  };

  const handleRemove = () => {
    onRemove({ name, value, filter: operator });
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
        : (selectedOption.label ?? selectedOption.value)
      : value;
  }

  const operatorLabel = formatMessage({
    id: `components.FilterOptions.FILTER_TYPES.${operator}`,
    defaultMessage: operator,
  });

  const content = FILTERS_WITH_NO_VALUE.includes(operator)
    ? `${label} ${operatorLabel}`
    : `${label} ${operatorLabel} ${formattedValue}`;

  return (
    <Tag padding={1} onClick={handleRemove} icon={<Cross />} label={content}>
      <Box tag="span" cursor="pointer" onClick={handleEdit}>
        {content}
      </Box>
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

interface MainField {
  name: string;
  type: Schema.Attribute.Kind | 'custom';
}

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
       * ```
       */
      $and?: Array<Record<string, Record<string, string | Record<string, string>>>>;
    };
    page?: number;
  }
}

export { Filters };
