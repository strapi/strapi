// @TODO: Probably user & role types should be imported from a common package
interface RoleInfo {
  id: number | string;
  name: string;
  code: string;
  description?: string;
  usersCount?: number;
}

export interface UserInfo {
  id: number | string;
  firstname: string;
  lastname?: string;
  username?: null | string;
  email: string;
  isActive: boolean;
  blocked: boolean;
  preferedLanguage: null | string;
  roles: RoleInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseData {
  name: string;
  actions?: ReleaseActionData[];
}

interface ReleaseActionData {
  type: 'publish' | 'unpublish';
  entry: number | string;
  contentType: string;
}
