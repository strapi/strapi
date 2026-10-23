import path from 'node:path';
import jscodeshift from 'jscodeshift';

import transform from '../s3-keys-wrapped-in-credentials.code';

const pluginsPath = (extension: 'js' | 'ts') =>
  path.join(process.cwd(), `config/plugins.${extension}`);

const applyTransform = (source: string, filePath: string = pluginsPath('js')) =>
  transform(
    { path: filePath, source },
    { j: jscodeshift, jscodeshift, stats() {}, report() {} } as never,
    {}
  );

describe('s3-keys-wrapped-in-credentials codemod', () => {
  it('wraps credentials and creates s3Options when the v4 config has neither', () => {
    const source = `module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
        region: env('AWS_REGION'),
      },
    },
  },
});`;

    const result = applyTransform(source) as string;

    expect(result).toContain('s3Options');
    expect(result).toContain('credentials');
    expect(result).toMatch(/credentials:\s*\{\s*accessKeyId: env\('AWS_ACCESS_KEY_ID'\)/);
    // The flat keys must no longer sit directly under providerOptions.
    expect(result).not.toMatch(/providerOptions:\s*\{\s*accessKeyId/);
    // Unrelated options are preserved.
    expect(result).toContain("region: env('AWS_REGION')");
  });

  it('wraps credentials that already live inside s3Options', () => {
    const source = `module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_ACCESS_SECRET'),
        },
      },
    },
  },
});`;

    const result = applyTransform(source) as string;

    expect(result).toMatch(/credentials:\s*\{\s*accessKeyId: env\('AWS_ACCESS_KEY_ID'\)/);
    expect(result).not.toMatch(/s3Options:\s*\{\s*accessKeyId/);
  });

  it('transforms a TypeScript plugins file', () => {
    const source = `export default ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
      },
    },
  },
});`;

    const result = applyTransform(source, pluginsPath('ts')) as string;

    expect(result).toMatch(/credentials:\s*\{\s*accessKeyId: env\('AWS_ACCESS_KEY_ID'\)/);
  });

  it('leaves providers other than aws-s3 untouched', () => {
    const source = `module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        accessKeyId: env('KEY'),
        secretAccessKey: env('SECRET'),
      },
    },
  },
});`;

    expect(applyTransform(source)).toBe(source);
  });

  it('leaves an already migrated config untouched', () => {
    const source = `module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env('AWS_ACCESS_KEY_ID'),
            secretAccessKey: env('AWS_ACCESS_SECRET'),
          },
        },
      },
    },
  },
});`;

    expect(applyTransform(source)).toBe(source);
  });

  it('preserves spread elements while moving the credentials', () => {
    const source = `module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        ...sharedOptions,
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
      },
    },
  },
});`;

    const result = applyTransform(source) as string;

    expect(result).toContain('...sharedOptions');
    expect(result).toMatch(/credentials:\s*\{\s*accessKeyId: env\('AWS_ACCESS_KEY_ID'\)/);
  });

  it('ignores files other than config/plugins', () => {
    const source = `module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
      },
    },
  },
});`;

    expect(applyTransform(source, path.join(process.cwd(), 'config/database.js'))).toBe(source);
  });
});
