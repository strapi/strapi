import { Field, Flex, JSONInput } from '@strapi/design-system';
import { forwardRef } from 'react';

/**
  * OrderMultilineInput component, used in Content Manager to display JSON input for multiline order field
  */
const OrderMultilineInput = forwardRef<HTMLInputElement, any>((props, ref) => {
  const { attribute, hint, disabled = false, labelAction, label, name, required = false, onChange, value, error } = props;

  const handleChange = (i: string) => {
    onChange({
      target: { name, type: attribute.type, value: JSON.parse(i) },
    });
  };

  return (
    <Field.Root name={name} id={name} error={error} hint={hint} required={required}>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <JSONInput
          ref={ref}
          disabled={disabled}
          value={JSON.stringify(value, null, 2)}
          required={required}
          onChange={handleChange} />
        <Field.Hint />
        <Field.Error />
      </Flex>
    </Field.Root>
  );
});

export default OrderMultilineInput;