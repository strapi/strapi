export interface Permission {
  action: string;
  subject?: string | object | null;
  properties?: object;
  conditions?: string[];
}
