import {Strapi} from "../../types";
import Koa from "koa";
import KoaRouter from "@koa/router";
import {Server as HttpServer} from 'http';
import {Server as NetServer} from 'net';


function createServer(strapi: Strapi): StrapiServer

export default {
    createServer
}

interface StrapiServer {
    app: Koa
    router: KoaRouter
    httpServer: HttpServer

    api(name: string): any

    use(...args): StrapiServer

    routes(routes): StrapiServer

    mount(): StrapiServer

    initRouting(): StrapiServer

    initMiddlewares(): StrapiServer

    listRoutes(): any[]

    listen(...args): NetServer

    destroy()
}
