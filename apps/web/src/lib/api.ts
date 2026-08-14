import { treaty } from "@elysia/eden";
import type { App } from "@uploady/api";

const _api = treaty<App>(
  import.meta.env.VITE_API_URL ?? window.location.origin,
);

export const api = _api.api;
