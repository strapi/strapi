import fs from 'node:fs';
import path from 'node:path';

const translationsDir = path.join(__dirname, '..');

describe('EditView shortcut hint translations', () => {
  const localeFiles = fs.readdirSync(translationsDir).filter((file) => file.endsWith('.json'));

  it.each(localeFiles)(
    '%s defines publish and save hints without the legacy {action} placeholder',
    (file) => {
      const translations = JSON.parse(
        fs.readFileSync(path.join(translationsDir, file), 'utf8')
      ) as Record<string, string>;

      if (!('containers.EditView.saveHint' in translations)) {
        return;
      }

      expect(translations['containers.EditView.publishHint']).toBeDefined();
      expect(translations['containers.EditView.saveHint']).not.toContain('{action}');
      expect(translations['containers.EditView.publishHint'].length).toBeGreaterThan(0);
    }
  );
});
