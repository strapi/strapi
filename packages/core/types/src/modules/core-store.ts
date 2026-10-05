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
    get<T = unknown>(params?: Partial<GetParams>): Promise<T>;
    set(params?: Partial<SetParams>): Promise<void>;
    delete(params?: Partial<GetParams>): Promise<void>;
  };
  get<T = unknown>(params: GetParams): Promise<T>;
  set(params: SetParams): Promise<void>;
  delete(params: GetParams): Promise<void>;
}
