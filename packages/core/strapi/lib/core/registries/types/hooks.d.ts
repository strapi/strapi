
type Handler = (context: any) => any;

type AsyncHook = {
  handlers: Handler[];
  register(handler: Handler): this;
  delete(handler: Handler): this;
  call(): Promise<void>;
};


type SyncHook = {
  get handlers(): Handler[];
  register(handler: Handler): this;
  delete(handler: Handler): this;
  call(): void;
};


export type Hook = AsyncHook|SyncHook
