import type { Context as ApiContext } from "@estudos-ia/api/context";
import type { NextRequest } from "next/server";

import { db } from "./services";

export async function createContext(_req: NextRequest): Promise<ApiContext> {
  return {
    db,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
