type GetParams = {
  key: string;
  type?: string;
  environment?: string;
  name?: string;
  tag?: string;
};

export interface StrapiHost {
  getModel(uid: string): unknown;
  store: {
    get(params: GetParams): Promise<unknown>;
  };
}
