import { addDays, format } from 'date-fns';

const getDateOfExpiration = (createdAt, duration) =>
  format(addDays(new Date(createdAt), duration), 'PPP');

export default getDateOfExpiration;
