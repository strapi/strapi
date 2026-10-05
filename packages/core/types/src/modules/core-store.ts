type SetParams = {
  key: string;
  value: unknown;
  type?: string;
  environment?: string;
  name?: string;
  tag?: string;
};

type GetParams = {
  key: string;
  type?: string;
  environment?: string;
  name?: string;
  tag?: string;
};

type Params = SetParams & GetParams;

export interface CoreStore {
  (defaultParams: Partial<Params>): {
    get(params?: Partial<GetParams>): Promise<unknown>;
    set(params?: Partial<SetParams>): Promise<void>;
    delete(params?: Partial<GetParams>): Promise<void>;
  };
  get(params: GetParams): Promise<unknown>;
  set(params: SetParams): Promise<void>;
  delete(params: GetParams): Promise<void>;
}
