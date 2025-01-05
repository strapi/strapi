import { Field, Flex, NumberInput } from '@strapi/design-system';
import { forwardRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

/**
  * OrderInput component, used in Content Manager to display number input for 1d order field
  */
const OrderInput = forwardRef<HTMLInputElement, any>((props, ref) => {
  const { attribute, hint, disabled = false, labelAction, label, name, required = false, onChange, value, error, placeholder } = props;
  const { formatMessage } = useTranslation();

  const handleChange = (i: number | undefined) => {
    onChange({
      target: { name, type: attribute.type, value: i },
    });
  };

  return (
    <Field.Root name={name} id={name} error={error} hint={hint} required={required}>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <NumberInput
          ref={ref}
          name={name}
          disabled={disabled}
          value={value}
          required={required}
          placeholder={placeholder || formatMessage({ id: 'order.input.placeholder' })}
          onValueChange={handleChange} />
        <Field.Hint />
        <Field.Error />
      </Flex>
    </Field.Root>
  );
});

export default OrderInput;