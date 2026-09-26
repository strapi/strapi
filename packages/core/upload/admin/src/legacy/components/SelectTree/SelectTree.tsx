import * as React from 'react';

import { Box } from '@strapi/design-system';
import { Cross, CaretDown } from '@strapi/icons';
import ReactSelect, {
  components,
  GroupBase,
  StylesConfig,
  ClearIndicatorProps,
} from 'react-select';
import { styled, useTheme, DefaultTheme } from 'styled-components';

import { Option } from './Option';
import { flattenTree, FlattenedNode } from './utils/flattenTree';
import { getOpenValues } from './utils/getOpenValues';
import { getValuesToClose } from './utils/getValuesToClose';

const hasParent = (option: FlattenedNode<string | number | null>) => !option.parent;

export type OptionSelectTree = {
  value: string | number | null;
  label?: string;
  children?: OptionSelectTree[];
};

export interface SelectTreeProps<
  Option = unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IsMulti extends boolean = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Group extends GroupBase<Option> = GroupBase<Option>,
> {
  maxDisplayDepth?: number;
  defaultValue?: {
    value?: string | number | null;
  };
  options: OptionSelectTree[];
  onChange?: (value: Record<string, string | number>) => void;
  name?: string;
  menuPortalTarget?: HTMLElement | null;
  inputId?: string;
  error?: string;
  ariaErrorMessage?: string;
  isDisabled?: boolean;
  disabled?: boolean;
}

export const SelectTree = ({
  options: defaultOptions,
  maxDisplayDepth = 5,
  defaultValue,
  ...props
}: SelectTreeProps) => {
  const flatDefaultOptions = React.useMemo(() => flattenTree(defaultOptions), [defaultOptions]);
  const optionsFiltered = React.useMemo(
    () => flatDefaultOptions.filter(hasParent),
    [flatDefaultOptions]
  );
  const [options, setOptions] = React.useState(optionsFiltered);
  const [openValues, setOpenValues] = React.useState(
    getOpenValues(flatDefaultOptions, defaultValue)
  );

  React.useEffect(() => {
    if (openValues.length === 0) {
      setOptions(flatDefaultOptions.filter((option) => option.parent === undefined));
    } else {
      const allOpenValues = openValues.reduce<(string | number | null)[]>((acc, value) => {
        const options = flatDefaultOptions.filter(
          (option) => option.value === value || option.parent === value
        );

        options.forEach((option) => {
          const values = getOpenValues(flatDefaultOptions, option);
          acc = [...acc, ...values];
        });

        return acc;
      }, []);

      const nextOptions = flatDefaultOptions.filter((option) =>
        allOpenValues.includes(option.value)
      );

      setOptions(nextOptions);
    }
  }, [openValues, flatDefaultOptions, optionsFiltered]);

  const handleToggle = (value: string | number | null) => {
    if (openValues.includes(value)) {
      const valuesToClose = getValuesToClose(flatDefaultOptions, value);
      setOpenValues((prev) => prev.filter((prevData) => !valuesToClose.includes(prevData)));
    } else {
      setOpenValues((prev) => [...prev, value]);
    }
  };

  return (
    <Select
      components={{ Option }}
      options={options}
      defaultValue={defaultValue}
      isSearchable={false}
      /* -- custom props, used by the Option component */
      maxDisplayDepth={maxDisplayDepth}
      openValues={openValues}
      onOptionToggle={handleToggle}
      /* -- / custom props */
      {...props}
    />
  );
};

type SelectOption = { value?: string | number | null; label?: string };

interface SelectProps<
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> {
  components?: object;
  styles?: StylesConfig<Option, IsMulti, Group>;
  error?: string;
  ariaErrorMessage?: string;
  options: OptionSelectTree[];
  defaultValue?: {
    value?: string | number | null;
  };
  isSearchable?: boolean;
  maxDisplayDepth?: number;
  openValues?: (string | number | null)[];
  onOptionToggle?: (value: string | number | null) => void;
}

const Select = ({
  components = {},
  styles = {},
  error,
  ariaErrorMessage,
  ...props
}: SelectProps) => {
  const theme = useTheme();
  const customStyles = getSelectStyles(theme, error);

  return (
    <ReactSelect
      menuPosition="fixed"
      components={{
        ...components,
        ClearIndicator,
        DropdownIndicator,
        IndicatorSeparator: () => null,
        LoadingIndicator: () => null,
      }}
      aria-errormessage={error && ariaErrorMessage}
      aria-invalid={!!error}
      styles={
        { ...customStyles, ...styles } as StylesConfig<SelectOption, false, GroupBase<SelectOption>>
      }
      {...props}
    />
  );
};

const IconBox = styled(Box)`
  background: transparent;
  border: none;
  position: relative;
  z-index: 1;

  svg {
    height: 1.1rem;
    width: 1.1rem;
  }

  svg path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const ClearIndicator = (
  props: ClearIndicatorProps<SelectOption, false, GroupBase<SelectOption>>
) => {
  const Component = components.ClearIndicator;

  return (
    <Component {...props}>
      <IconBox tag="button" type="button">
        <Cross />
      </IconBox>
    </Component>
  );
};

const CarretBox = styled(IconBox)`
  display: flex;
  background: none;
  border: none;

  svg {
    width: 0.9rem;
  }
`;

const DropdownIndicator = ({ innerProps }: { innerProps: object }) => {
  return (
    <CarretBox paddingRight={3} {...innerProps}>
      <CaretDown />
    </CarretBox>
  );
};

const getSelectStyles = (
  theme: DefaultTheme,
  error?: string
): StylesConfig<SelectOption, false, GroupBase<SelectOption>> => {
  return {
    clearIndicator: (base: object) => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    container: (base: object) => ({
      ...base,
      background: theme.colors.neutral0,
      lineHeight: 'normal',
    }),
    control(base: object, state: { isFocused: boolean; isDisabled: boolean }) {
      let borderColor = theme.colors.neutral200;
      let boxShadowColor: string | undefined = undefined;
      let backgroundColor: string | undefined = undefined;

      if (state.isFocused) {
        borderColor = theme.colors.primary600;
        boxShadowColor = theme.colors.primary600;
      } else if (error) {
        borderColor = theme.colors.danger600;
      }

      if (state.isDisabled) {
        backgroundColor = `${theme.colors.neutral150} !important`;
      }

      return {
        ...base,
        fontSize: theme.fontSizes[2],
        height: 40,
        border: `1px solid ${borderColor} !important`,
        outline: 0,
        backgroundColor,
        borderRadius: theme.borderRadius,
        boxShadow: boxShadowColor ? `${boxShadowColor} 0px 0px 0px 2px` : '',
      };
    },
    indicatorsContainer: (base: object) => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    input: (base: object) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: theme.colors.neutral800,
      gridTemplateColumns: '0 100%',
    }),
    menuPortal: (base: object) => ({
      ...base,
      zIndex: theme.zIndices.dialog,
      pointerEvents: 'auto',
    }),
    menu(base: object) {
      return {
        ...base,
        width: '100%',
        marginTop: theme.spaces[1],
        backgroundColor: theme.colors.neutral0,
        color: theme.colors.neutral800,
        borderRadius: theme.borderRadius,
        border: `1px solid ${theme.colors.neutral200}`,
        boxShadow: theme.shadows.tableShadow,
        fontSize: theme.fontSizes[2],
        zIndex: 2,
      };
    },
    menuList: (base: object) => ({
      ...base,
      paddingLeft: theme.spaces[1],
      paddingTop: theme.spaces[1],
      paddingRight: theme.spaces[1],
      paddingBottom: theme.spaces[1],
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    option(base: any, state: { isFocused: boolean; isSelected: boolean }) {
      let backgroundColor = base?.backgroundColor as string;

      if (state.isFocused || state.isSelected) {
        backgroundColor = theme.colors.primary100;
      }

      return {
        ...base,
        color: theme.colors.neutral800,
        lineHeight: theme.spaces[5],
        backgroundColor,
        borderRadius: theme.borderRadius,
        '&:active': {
          backgroundColor: theme.colors.primary100,
        },
      };
    },
    placeholder: (base: object) => ({
      ...base,
      color: theme.colors.neutral600,
      marginLeft: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '80%',
    }),
    singleValue(base: object, state: { isDisabled: boolean }) {
      let color = theme.colors.neutral800;

      if (state.isDisabled) {
        color = theme.colors.neutral600;
      }

      return { ...base, marginLeft: 0, color };
    },
    valueContainer: (base: object) => ({
      ...base,
      cursor: 'pointer',
      padding: 0,
      paddingLeft: theme.spaces[4],
      marginLeft: 0,
      marginRight: 0,
    }),
  };
};
