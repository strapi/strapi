import { addDays, format } from 'date-fns';
import * as locales from 'date-fns/locale';

import { getDateFnsLocaleName } from '../../../../../../utils/locales';

export const getDateOfExpiration = (
  createdAt: string,
  duration: number | null,
  language: string = 'en'
) => {
  if (duration && typeof duration === 'number') {
    const durationInDays = duration / 24 / 60 / 60 / 1000;

    return format(addDays(new Date(createdAt), durationInDays), 'PPP', {
      locale: locales[getDateFnsLocaleName(language)],
    });
  }

  return 'Unlimited';
};
