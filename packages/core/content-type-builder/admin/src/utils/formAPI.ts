import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import * as yup from 'yup';

type YupObjectShape = Parameters<ReturnType<typeof yup.object>['shape']>[0];
type YupObjectSchema = ReturnType<typeof yup.object>;
type FormSection = unknown;
type FormExtensionHandler = (props?: unknown) => FormSection[];
type FormValidator = (args: unknown[]) => YupObjectShape;
type ContentTypeSchemaMutation = (
  data: Record<string, unknown>,
  initialData: Record<string, unknown>
) => Record<string, unknown>;

type ExtensionForm = {
  advanced: FormExtensionHandler[];
  base: FormExtensionHandler[];
};

type ExtensionDefinition = {
  validators: FormValidator[];
  form: ExtensionForm;
};

type ExtensionInput = {
  validator?: FormValidator;
  form: {
    advanced: FormExtensionHandler;
    base: FormExtensionHandler;
  };
};

export type FormAPI = {
  components: {
    inputs: Record<string, unknown>;
    add: ({ id, component }: { id: string; component: unknown }) => void;
  };
  types: {
    attribute: {
      [key: string]: ExtensionDefinition;
    };
    contentType: ExtensionDefinition;
    component: ExtensionDefinition;
  };
  contentTypeSchemaMutations: ContentTypeSchemaMutation[];
  addContentTypeSchemaMutation: (cb: ContentTypeSchemaMutation) => void;
  extendContentType: (data: ExtensionInput) => void;
  extendFields: (fields: string[], data: ExtensionInput) => void;
  getAdvancedForm: (target: string[], props?: unknown) => FormSection[];
  makeCustomFieldValidator: (
    attributeShape: YupObjectSchema,
    validator: FormValidator | undefined,
    ...validatorArgs: unknown[]
  ) => YupObjectSchema;
  makeValidator: (
    target: string[],
    initShape: YupObjectSchema,
    ...args: unknown[]
  ) => YupObjectSchema;
  mutateContentTypeSchema: (
    data: Record<string, unknown>,
    initialData: Record<string, unknown>
  ) => Record<string, unknown>;
};

export const formsAPI: FormAPI = {
  components: {
    inputs: {},
    add({ id, component }) {
      if (this.inputs[id] === undefined) {
        this.inputs[id] = component;
      }
    },
  },
  types: {
    attribute: {
      // test: {
      //   validators: [],
      //   form: {
      //     advanced: [
      //       /* cb */
      //     ],
      //     base: [
      //       /* cb */
      //     ],
      //   },
      // },
    },
    contentType: {
      validators: [],
      form: {
        advanced: [],
        base: [],
      },
    },
    component: {
      validators: [],
      form: {
        advanced: [],
        base: [],
      },
    },
  },
  contentTypeSchemaMutations: [],
  addContentTypeSchemaMutation(cb) {
    this.contentTypeSchemaMutations.push(cb);
  },
  extendContentType({ validator, form: { advanced, base } }) {
    const { contentType } = this.types;

    if (validator !== undefined) {
      contentType.validators.push(validator);
    }
    contentType.form.advanced.push(advanced);
    contentType.form.base.push(base);
  },
  extendFields(fields, { validator, form: { advanced, base } }) {
    const formType = this.types.attribute;

    fields.forEach((field) => {
      if (!formType[field]) {
        formType[field] = {
          validators: [],
          form: {
            advanced: [
              /* cb */
            ],
            base: [
              /* cb */
            ],
          },
        };
      }

      if (validator !== undefined) {
        formType[field].validators.push(validator);
      }
      formType[field].form.advanced.push(advanced);
      formType[field].form.base.push(base);
    });
  },

  getAdvancedForm(target, props = null) {
    const advancedForms = get(
      this.types,
      [...target, 'form', 'advanced'],
      []
    ) as FormExtensionHandler[];
    const sectionsToAdd = advancedForms.reduce<FormSection[]>((acc, current) => {
      const sections = current(props);

      return [...acc, ...sections];
    }, []);

    return sectionsToAdd;
  },

  makeCustomFieldValidator(attributeShape, validator, ...validatorArgs) {
    // When no validator, return the attribute shape
    if (validator === undefined) {
      return attributeShape;
    }

    // Otherwise extend the shape with the provided validator
    return attributeShape.shape({ options: yup.object().shape(validator(validatorArgs)) });
  },

  makeValidator(target, initShape, ...args) {
    const validators = get(this.types, [...target, 'validators'], []) as FormValidator[];

    const pluginOptionsShape = validators.reduce<YupObjectShape>((acc, current) => {
      const pluginOptionShape = current(args);

      return { ...acc, ...pluginOptionShape };
    }, {});

    return initShape.shape({ pluginOptions: yup.object().shape(pluginOptionsShape) });
  },
  mutateContentTypeSchema(data: Record<string, unknown>, initialData: Record<string, unknown>) {
    let enhancedData = cloneDeep(data);

    const refData = cloneDeep(initialData);

    this.contentTypeSchemaMutations.forEach((cb) => {
      enhancedData = cb(enhancedData, refData);
    });

    return enhancedData;
  },
};
