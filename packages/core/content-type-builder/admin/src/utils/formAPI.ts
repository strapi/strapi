import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import * as yup from 'yup';
// TODO V5 Convert any into real types
export const formsAPI: any = {
  components: {
    inputs: {} as Record<string, any>,
    add({ id, component }: { id: string; component: any }) {
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
  addContentTypeSchemaMutation(cb: any) {
    this.contentTypeSchemaMutations.push(cb);
  },
  extendContentType({ validator, form: { advanced, base } }: any) {
    const { contentType } = this.types;

    contentType.validators.push(validator);
    contentType.form.advanced.push(advanced);
    contentType.form.base.push(base);
  },
  extendFields(fields: any, { validator, form: { advanced, base } }: any) {
    const formType = this.types.attribute;

    fields.forEach((field: any) => {
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

      formType[field].validators.push(validator);
      formType[field].form.advanced.push(advanced);
      formType[field].form.base.push(base);
    });
  },

  getAdvancedForm(target: any, props = null) {
    const sectionsToAdd = get(this.types, [...target, 'form', 'advanced'], []).reduce(
      (acc: any, current: any) => {
        const sections = current(props);

        return [...acc, ...sections];
      },
      []
    );

    return sectionsToAdd;
  },

  makeCustomFieldValidator(attributeShape: any, validator: any, ...validatorArgs: any) {
    // When no validator, return the attribute shape
    if (!validator) return attributeShape;

    // Otherwise extend the shape with the provided validator
    return attributeShape.shape({ options: yup.object().shape(validator(validatorArgs)) });
  },

  makeValidator(target: any, initShape: any, ...args: any) {
    const validators = get(this.types, [...target, 'validators'], []);

    const pluginOptionsShape = validators.reduce((acc: any, current: any) => {
      const pluginOptionShape = current(args);

      return { ...acc, ...pluginOptionShape };
    }, {});

    return initShape.shape({ pluginOptions: yup.object().shape(pluginOptionsShape) });
  },
  mutateContentTypeSchema(data: Record<string, unknown>, initialData: Record<string, unknown>) {
    let enhancedData: any = cloneDeep(data);

    const refData: any = cloneDeep(initialData);

    this.contentTypeSchemaMutations.forEach((cb: any) => {
      enhancedData = cb(enhancedData, refData);
    });

    return enhancedData;
  },
};
