import { addDays, format } from 'date-fns';
import * as locales from 'date-fns/locale';

export const getDateOfExpiration = (
  createdAt: string,
  duration: number | null,
  language: string = 'en'
) => {
  if (duration && typeof duration === 'number') {
    const durationInDays = duration / 24 / 60 / 60 / 1000;

    return format(addDays(new Date(createdAt), durationInDays), 'PPP', {
      // @ts-expect-error I don't know how to fix this
      locale: locales[language],
    });
  }

  return 'Unlimited';
};
