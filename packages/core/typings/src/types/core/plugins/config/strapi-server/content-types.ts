import { ContentType } from '../../../schemas';

export interface ContentTypes {
  // TODO: is there anything else that can be here?
  [key: string]: { schema: ContentType };
}
