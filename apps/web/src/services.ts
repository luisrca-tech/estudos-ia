import { createDb } from "@estudos-ia/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
