import * as React from 'react';

import { InputProps, useField } from '@strapi/admin/strapi-admin';
import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDoc } from '../../../../../hooks/useDocument';
import { EditFieldLayout } from '../../../../../hooks/useDocumentLayout';
import { getTranslation } from '../../../../../utils/translations';
import { transformDocument } from '../../../utils/data';
import { createDefaultForm } from '../../../utils/forms';
import { type InputRendererProps } from '../../InputRenderer';

import { Initializer } from './Initializer';
import { NonRepeatableComponent } from './NonRepeatable';
import { RepeatableComponent } from './Repeatable';

interface ComponentInputProps
  extends Omit<Extract<EditFieldLayout, { type: 'component' }>, 'size' | 'hint'>,
    Pick<InputProps, 'hint'> {
  labelAction?: React.ReactNode;
  children: (props: InputRendererProps) => React.ReactNode;
  /**
   * We need layout to come from the props, and not via a hook, because Content History needs
   * a way to modify the normal component layout to add hidden fields.
   */
  layout: EditFieldLayout[][];
}

const ComponentInput = ({
  label,
  required,
  name,
  attribute,
  disabled,
  labelAction,
  ...props
}: ComponentInputProps) => {
  const { formatMessage } = useIntl();
  const field = useField(name);

  const showResetComponent = !attribute.repeatable && field.value && !disabled;

  const { components } = useDoc();

  const handleInitialisationClick = () => {
    const schema = components[attribute.component];
    const form = createDefaultForm(schema, components);
    const data = transformDocument(schema, components)(form);

    field.onChange(name, data);
  };

  return (
    <Box>
      <Flex justifyContent="space-between">
        <Flex paddingBottom={1}>
          <Typography
            textColor="neutral800"
            htmlFor={name}
            variant="pi"
            fontWeight="bold"
            tag="label"
          >
            {label}
            {attribute.repeatable && (
              <>&nbsp;({Array.isArray(field.value) ? field.value.length : 0})</>
            )}
            {required && <Typography textColor="danger600">*</Typography>}
          </Typography>
          {labelAction && <Box paddingLeft={1}>{labelAction}</Box>}
        </Flex>

        {showResetComponent && (
          <IconButton
            label={formatMessage({
              id: getTranslation('components.reset-entry'),
              defaultMessage: 'Reset Entry',
            })}
            icon={<Trash />}
            borderWidth={0}
            onClick={() => {
              field.onChange(name, null);
            }}
          />
        )}
      </Flex>
      <Flex direction="column" alignItems="stretch" gap={1}>
        {/**
         * if the field isn't repeatable then we display a button to start the field
         * TODO: should this just live in the `NonRepeatableComponent`?
         */}
        {!attribute.repeatable && !field.value && (
          <Initializer disabled={disabled} name={name} onClick={handleInitialisationClick} />
        )}
        {!attribute.repeatable && field.value ? (
          <NonRepeatableComponent attribute={attribute} name={name} disabled={disabled} {...props}>
            {props.children}
          </NonRepeatableComponent>
        ) : null}
        {attribute.repeatable && (
          <RepeatableComponent attribute={attribute} name={name} disabled={disabled} {...props}>
            {props.children}
          </RepeatableComponent>
        )}
      </Flex>
    </Box>
  );
};

// const LabelAction = styled(Box)`
//   svg path {
//     fill: ${({ theme }) => theme.colors.neutral500};
//   }
// `;

export { ComponentInput };
export type { ComponentInputProps };
