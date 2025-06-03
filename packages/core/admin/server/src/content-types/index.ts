import Permission from './Permission';
import User from './User';
import Role from './Role';
import apiToken from './api-token';
import apiTokenPermission from './api-token-permission';
import transferToken from './transfer-token';
import transferTokenPermission from './transfer-token-permission';

export default {
  permission: { schema: Permission },
  user: { schema: User },
  role: { schema: Role },
  'api-token': { schema: apiToken },
  'api-token-permission': { schema: apiTokenPermission },
  'transfer-token': { schema: transferToken },
  'transfer-token-permission': { schema: transferTokenPermission },
};
