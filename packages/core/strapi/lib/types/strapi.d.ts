import {
  DefaultContext,
  DefaultState,
  ParameterizedContext,
  Request
} from "koa";

import { Database } from "@strapi/database";
import { EntityService } from "../services/entity-service";
import { Strapi as StrapiClass } from "../Strapi";

export interface Strapi extends StrapiClass {
  query: Database["query"];
  entityService: EntityService;
}
