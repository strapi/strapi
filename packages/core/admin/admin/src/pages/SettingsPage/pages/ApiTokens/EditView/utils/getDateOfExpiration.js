import { addDays, format } from 'date-fns';
import * as locales from 'date-fns/locale';

const getDateOfExpiration = (createdAt, duration, language = 'en') => {
  if (duration && typeof duration === 'number') {
    const durationInDays = duration / 24 / 60 / 60 / 1000;

    return format(addDays(new Date(createdAt), durationInDays), 'PPP', {
      locale: locales[language],
    });
  }

  return 'Unlimited';
};

export default getDateOfExpiration;
