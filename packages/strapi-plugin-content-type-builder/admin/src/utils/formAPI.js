import { get } from 'lodash';
import * as yup from 'yup';

const formsAPI = {
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
  extendContentType({ validator, form: { advanced, base } }) {
    const { contentType } = this.types;

    contentType.validators.push(validator);
    contentType.form.advanced.push(advanced);
    contentType.form.base.push(base);
  },
  extendFields(fields, { validator, form: { advanced, base } }) {
    const formType = this.types.attribute;

    fields.forEach(field => {
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

        formType[field].validators.push(validator);
        formType[field].form.advanced.push(advanced);
        formType[field].form.base.push(base);
      }
    });
  },
  makeAdvancedForm(target, initSections, ...args) {
    const sectionsToAdd = get(this.types, [...target, 'form', 'advanced'], []).reduce(
      (acc, current) => {
        const sections = current(args);

        return [...acc, ...sections];
      },
      []
    );

    return { items: [...initSections, ...sectionsToAdd] };
  },
  makeValidator(target, initShape, ...args) {
    const validators = get(this.types, [...target, 'validators'], []);

    const pluginOptionsShape = validators.reduce((acc, current) => {
      const pluginOptionShape = current(args);

      return { ...acc, ...pluginOptionShape };
    }, {});

    return initShape.shape({ pluginOptions: yup.object().shape(pluginOptionsShape) });
  },
};

export default formsAPI;
