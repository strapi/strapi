/* eslint-disable check-file/filename-naming-convention */

import invariant from 'invariant';

import type { Data } from '@strapi/types';

/** The admin forms whose body can carry plugin values, under `plugins.<pluginId>` */
const FORMS = ['role', 'user', 'content-api-token'] as const;

type FormFieldsForm = (typeof FORMS)[number];

/** Core fields a plugin can take over */
type ReplaceableField = 'roles';

interface ReplacedField {
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

interface FormFieldsProps {
  /** The plugin's value, sent to the server as `plugins.<pluginId>` */
  value: unknown;
  /** The server error for the plugin's value, at `plugins.<pluginId>` */
  error?: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
  /** The edited entity, `undefined` when the form creates one */
  entityId?: Data.ID;
  /** The core fields the plugin replaces, which it now shows and sets */
  replacedFields: Partial<Record<ReplaceableField, ReplacedField>>;
}

interface FormFieldsArgs {
  pluginId: string;
  /** Rendered in the form, on a row of its own */
  Component: React.ComponentType<FormFieldsProps>;
  /** Hides these core fields: the component shows and sets them instead */
  replaces?: ReplaceableField[];
}

type DescriptionReducer = (prev: FormFieldsArgs[]) => FormFieldsArgs[];

class FormFields {
  formFields: Record<FormFieldsForm, FormFieldsArgs[]> = {
    role: [],
    user: [],
    'content-api-token': [],
  };

  private checkFormFields = (form: FormFieldsForm, formFields: FormFieldsArgs[]): void => {
    formFields.forEach(({ pluginId, Component }, index) => {
      invariant(pluginId, 'A pluginId must be provided');
      invariant(Component, 'A Component must be provided');
      invariant(
        formFields.findIndex((field) => field.pluginId === pluginId) === index,
        `Fields of the "${pluginId}" plugin have already been added to the ${form} form`
      );
    });
  };

  /**
   * Adds plugin fields to a core admin form. The server receives their value under
   * `plugins.<pluginId>`, which the plugin checks and saves with the form extensions service.
   */
  unstable_register(form: FormFieldsForm, formFields: FormFieldsArgs[] | DescriptionReducer) {
    invariant(FORMS.includes(form), `"${form}" is not a form plugins can add fields to`);

    if (Array.isArray(formFields)) {
      const next = [...this.formFields[form], ...formFields];
      this.checkFormFields(form, next);
      this.formFields[form] = next;
    } else if (typeof formFields === 'function') {
      const next = formFields(this.formFields[form]);
      this.checkFormFields(form, next);
      this.formFields[form] = next;
    } else {
      throw new Error('Expected form fields to be an array or a reducer function');
    }
  }

  get = (form: FormFieldsForm): FormFieldsArgs[] => this.formFields[form];

  replaces = (form: FormFieldsForm, field: ReplaceableField): boolean =>
    this.formFields[form].some(({ replaces }) => replaces?.includes(field));
}

export { FormFields };
export type { FormFieldsArgs, FormFieldsForm, FormFieldsProps, ReplaceableField, ReplacedField };
