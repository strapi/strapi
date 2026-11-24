/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import {
  FormFields,
  type FormFieldsArgs,
  type FormFieldsForm,
  type FormFieldsProps,
} from '../src/core/apis/FormFields';

/** Called each time a teams field mounts, to check that forms remount plugin fields after a save */
const teamsFieldMounted = jest.fn();

/**
 * A plugin field that sets `{ teams: ['blue'] }` when clicked, and the roles it replaces to none,
 * as a plugin that holds roles per space can
 */
const TeamsField = ({ value, onChange, entityId, replacedFields }: FormFieldsProps) => {
  React.useEffect(() => {
    teamsFieldMounted();
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        onChange({ teams: ['blue'] });
        replacedFields.roles?.onChange([]);
      }}
    >
      {`Teams of ${entityId ?? 'new'}: ${JSON.stringify(value ?? null)}`}
    </button>
  );
};

/** Test `formFields` with the teams plugin field on a form, for `providerOptions` */
const createTeamsFormFields = (form: FormFieldsForm, args: Partial<FormFieldsArgs> = {}) => {
  const formFields = new FormFields();
  formFields.unstable_register(form, [{ pluginId: 'teams', Component: TeamsField, ...args }]);

  return formFields;
};

export { createTeamsFormFields, teamsFieldMounted };
