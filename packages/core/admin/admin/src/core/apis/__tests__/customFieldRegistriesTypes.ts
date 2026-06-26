import type { CustomFieldOptionInput, CustomFieldOptionName } from '../CustomFields';

const builtInInput: CustomFieldOptionInput = 'checkbox';
const augmentedInput: CustomFieldOptionInput = 'test-slider';

// @ts-expect-error -- custom input ids must be registered in CustomFieldOptionInputRegistry
const unregisteredInput: CustomFieldOptionInput = 'not-registered';

const builtInName: CustomFieldOptionName = 'regex';
const augmentedName: CustomFieldOptionName = 'options.test-slider-label';

// @ts-expect-error -- custom option names must be registered in CustomFieldOptionNameRegistry
const unregisteredName: CustomFieldOptionName = 'options.not-registered';

export {
  augmentedInput,
  augmentedName,
  builtInInput,
  builtInName,
  unregisteredInput,
  unregisteredName,
};
