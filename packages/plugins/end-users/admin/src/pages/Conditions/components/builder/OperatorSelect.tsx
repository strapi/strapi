import { SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { operatorsFor } from '../../../../../../shared/builder/operators';
import { getTranslation } from '../../../../utils/getTranslation';

import type { ValueSlot } from '../../utils/builderOptions';

interface OperatorSelectProps {
  label: string;
  slot?: ValueSlot;
  value: string;
  disabled?: boolean;
  onChange: (operator: string) => void;
}

/** The operators a field of this type offers, and no others */
export const OperatorSelect = ({ label, slot, value, disabled, onChange }: OperatorSelectProps) => {
  const { formatMessage } = useIntl();
  const id = (key: string) => getTranslation(`conditions.builder.operator.${key}`);

  const labels: Record<string, string> = {
    $eq: formatMessage({ id: id('eq'), defaultMessage: 'is' }),
    $ne: formatMessage({ id: id('ne'), defaultMessage: 'is not' }),
    $lt: formatMessage({ id: id('lt'), defaultMessage: 'is less than' }),
    $lte: formatMessage({ id: id('lte'), defaultMessage: 'is at most' }),
    $gt: formatMessage({ id: id('gt'), defaultMessage: 'is more than' }),
    $gte: formatMessage({ id: id('gte'), defaultMessage: 'is at least' }),
    $contains: formatMessage({ id: id('contains'), defaultMessage: 'contains' }),
    $notContains: formatMessage({ id: id('notContains'), defaultMessage: 'does not contain' }),
    $containsi: formatMessage({
      id: id('containsi'),
      defaultMessage: 'contains, ignoring case',
    }),
    $notContainsi: formatMessage({
      id: id('notContainsi'),
      defaultMessage: 'does not contain, ignoring case',
    }),
    $startsWith: formatMessage({ id: id('startsWith'), defaultMessage: 'starts with' }),
    $endsWith: formatMessage({ id: id('endsWith'), defaultMessage: 'ends with' }),
    $in: formatMessage({ id: id('in'), defaultMessage: 'is one of' }),
    $notIn: formatMessage({ id: id('notIn'), defaultMessage: 'is none of' }),
    $null: formatMessage({ id: id('null'), defaultMessage: 'is empty' }),
    $notNull: formatMessage({ id: id('notNull'), defaultMessage: 'is not empty' }),
  };
  const operators = slot ? operatorsFor(slot.type) : [];

  return (
    <SingleSelect
      aria-label={label}
      value={operators.includes(value) ? value : null}
      disabled={disabled || !slot}
      onChange={(next) => onChange(String(next))}
      placeholder={formatMessage({
        id: getTranslation('conditions.builder.operator.choose'),
        defaultMessage: 'Choose',
      })}
    >
      {operators.map((operator) => (
        <SingleSelectOption key={operator} value={operator}>
          {labels[operator] ?? operator}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};
