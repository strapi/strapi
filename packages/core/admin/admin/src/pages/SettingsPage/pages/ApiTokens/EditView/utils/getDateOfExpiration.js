import { addDays, format } from 'date-fns';
import * as locales from 'date-fns/locale';

const getDateOfExpiration = (createdAt, duration, language = 'en') => {
  if (duration) {
    return format(addDays(new Date(createdAt), duration), 'PPP', {
      locale: locales[language],
    });
  }

  return 'Unlimited';
};

export default getDateOfExpiration;
