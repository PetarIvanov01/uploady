import { parseApiEnvironment } from "./env.schema";

export const env = parseApiEnvironment(process.env);
