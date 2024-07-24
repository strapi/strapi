interface BuildArgs {
  optimize?: boolean;
}

declare const build: (args: BuildArgs) => Promise<void>;

interface CleanArgs {
  appDir: string;
  buildDestDir: string;
}

declare const clean: (args: CleanArgs) => Promise<void>;

interface WatchAdminArgs {
  browser?: string | boolean;
  open?: boolean;
  polling?: boolean;
}

declare const watchAdmin: (args: WatchAdminArgs) => Promise<void>;

export { build, BuildArgs, clean, CleanArgs, watchAdmin, WatchAdminArgs };
