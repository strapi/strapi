import * as contentTypes from './content-types';

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypes.constants;

export interface Options {
  user: User;
  isEdition?: boolean;
}

interface User {
  id: string | number;
}

const setCreatorFields =
  <TData extends object>({ user, isEdition = false }: Options) =>
  <TDataInner extends object = TData>(data: TDataInner) => {
    if (isEdition) {
      return { ...data, [UPDATED_BY_ATTRIBUTE]: user.id };
    }

    return {
      ...data,
      [CREATED_BY_ATTRIBUTE]: user.id,
      [UPDATED_BY_ATTRIBUTE]: user.id,
    };
  };

export default setCreatorFields;
