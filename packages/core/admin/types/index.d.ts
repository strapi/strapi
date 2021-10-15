import * as server from '../server';
import * as serverEE from '../ee/server';
export * from '../index';

type Server = typeof server & typeof serverEE;

export { Server };
