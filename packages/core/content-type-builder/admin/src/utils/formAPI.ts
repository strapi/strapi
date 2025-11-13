import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import * as yup from 'yup';

export interface FormAPI {
  components: {
    inputs: Record<string, any>;
    add: ({ id, component }: { id: string; component: any }) => void;
  };
  types: {
    attribute: {
      [key: string]: {
        validators: any[];
        form: {
          advanced: any[];
          base: any[];
        };
      };
    };
    contentType: {
      validators: any[];
      form: {
        advanced: any[];
        base: any[];
      };
    };
    component: {
      validators: any[];
      form: {
        advanced: any[];
        base: any[];
      };
    };
  };
  contentTypeSchemaMutations: any[];
  addContentTypeSchemaMutation: (cb: any) => void;
  extendContentType: (data: any) => void;
  extendFields: (fields: any[], data: any) => void;
  getAdvancedForm: (target: any, props?: any) => any[];
  makeCustomFieldValidator: (attributeShape: any, validator: any, ...validatorArgs: any) => any;
  makeValidator: (target: any, initShape: any, ...args: any) => any;
  mutateContentTypeSchema: (
    data: Record<string, unknown>,
    initialData: Record<string, unknown>
  ) => any;
}

export const formsAPI: FormAPI = {
  components: {
    inputs: {},
    add({ id, component }) {
      if (!this.inputs[id]) {
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

    if (validator) {
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

      if (validator) {
        formType[field].validators.push(validator);
      }
      formType[field].form.advanced.push(advanced);
      formType[field].form.base.push(base);
    });
  },

  getAdvancedForm(target, props = null) {
    const sectionsToAdd = get(this.types, [...target, 'form', 'advanced'], []).reduce(
      (acc: any, current: any) => {
        const sections = current(props);

        return [...acc, ...sections];
      },
      []
    );

    return sectionsToAdd;
  },

  makeCustomFieldValidator(attributeShape, validator, ...validatorArgs) {
    // When no validator, return the attribute shape
    if (!validator) return attributeShape;

    // Otherwise extend the shape with the provided validator
    return attributeShape.shape({ options: yup.object().shape(validator(validatorArgs)) });
  },

  makeValidator(target, initShape, ...args) {
    const validators = get(this.types, [...target, 'validators'], []);

    const pluginOptionsShape = validators.reduce((acc: any, current: any) => {
      const pluginOptionShape = current(args);

      return { ...acc, ...pluginOptionShape };
    }, {});

    return initShape.shape({ pluginOptions: yup.object().shape(pluginOptionsShape) });
  },
  mutateContentTypeSchema(data: Record<string, unknown>, initialData: Record<string, unknown>) {
    let enhancedData = cloneDeep(data);

    const refData = cloneDeep(initialData);

    this.contentTypeSchemaMutations.forEach((cb: any) => {
      enhancedData = cb(enhancedData, refData);
    });

    return enhancedData;
  },
};
