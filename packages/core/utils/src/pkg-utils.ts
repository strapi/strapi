import * as yup from 'yup';

interface Export {
  types?: string;
  source: string;
  module?: string;
  import?: string;
  require?: string;
  default: string;
}

const packageJsonSchema = yup.object({
  name: yup.string().required(),
  exports: yup.lazy((value) =>
    yup
      .object(
        typeof value === 'object'
          ? Object.entries(value).reduce(
              (acc, [key, value]) => {
                if (typeof value === 'object') {
                  acc[key] = yup
                    .object({
                      types: yup.string().optional(),
                      source: yup.string().required(),
                      module: yup.string().optional(),
                      import: yup.string().required(),
                      require: yup.string().required(),
                      default: yup.string().required(),
                    })
                    .noUnknown(true);
                } else {
                  acc[key] = yup
                    .string()
                    .matches(/^\.\/.*\.json$/)
                    .required();
                }

                return acc;
              },
              {} as Record<string, yup.SchemaOf<string> | yup.SchemaOf<Export>>
            )
          : undefined
      )
      .optional()
  ),
});

type PackageJson = yup.Asserts<typeof packageJsonSchema>;

const validatePkg = async ({ pkg }: { pkg: object }): Promise<PackageJson> => {
  try {
    return await packageJsonSchema.validate(pkg, {
      strict: true,
    });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      switch (err.type) {
        case 'required':
          if (err.path) {
            throw new Error(`'${err.path}' in 'package.json' is required`);
          }
          break;

        case 'noUnknown':
          if (err.path && err.params && 'unknown' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' contains the unknown key ${err.params.unknown}`
            );
          }
          break;

        default:
          if (err.path && err.params && 'value' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' is invalid (received '${typeof err.params.value}')`
            );
          }
      }
    }

    throw err;
  }
};

export type { PackageJson, Export };
export { validatePkg };
