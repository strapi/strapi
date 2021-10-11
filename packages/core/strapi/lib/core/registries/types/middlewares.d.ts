import { Middleware as KoaMiddleware } from "koa";
import { MiddlewareFactory } from "../../../middlewares/types";

export type Middleware = KoaMiddleware | MiddlewareFactory;
