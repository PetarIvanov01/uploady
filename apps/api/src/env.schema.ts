import { t, TypeCompiler } from "elysia/type-system";

export type EnvironmentSource = Record<string, string | undefined>;

const apiEnvironmentSchema = t.Object({
  DATABASE_URL: t.String({ format: "uri", minLength: 1 }),
  NODE_ENV: t.Optional(t.UnionEnum(["development", "test", "production"])),
  PORT: t.Optional(t.Integer({ maximum: 65_535, minimum: 1 })),
  S3_ACCESS_KEY_ID: t.String({ minLength: 1 }),
  S3_BUCKET_NAME: t.String({ minLength: 1 }),
  S3_ENDPOINT_URL: t.String({ format: "uri", minLength: 1 }),
  S3_FORCE_PATH_STYLE: t.Optional(t.Boolean()),
  S3_PUBLIC_ENDPOINT_URL: t.Optional(t.String({ format: "uri", minLength: 1 })),
  S3_SECRET_ACCESS_KEY: t.String({ minLength: 1 }),
});

const apiEnvironmentValidator = TypeCompiler.Compile(apiEnvironmentSchema);

const normalizedValue = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const normalizedInteger = (value: string | undefined) => {
  const normalized = normalizedValue(value);

  if (normalized === undefined) return undefined;
  if (/^\d+$/.test(normalized)) return Number(normalized);

  return normalized;
};

const normalizedBoolean = (value: string | undefined) => {
  const normalized = normalizedValue(value);

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return normalized;
};

export const parseApiEnvironment = (source: EnvironmentSource) => {
  const candidate = {
    DATABASE_URL: normalizedValue(source.DATABASE_URL),
    NODE_ENV: normalizedValue(source.NODE_ENV),
    PORT: normalizedInteger(source.PORT),
    S3_ACCESS_KEY_ID: normalizedValue(source.S3_ACCESS_KEY_ID),
    S3_BUCKET_NAME: normalizedValue(source.S3_BUCKET_NAME),
    S3_ENDPOINT_URL: normalizedValue(source.S3_ENDPOINT_URL),
    S3_FORCE_PATH_STYLE: normalizedBoolean(source.S3_FORCE_PATH_STYLE),
    S3_PUBLIC_ENDPOINT_URL: normalizedValue(source.S3_PUBLIC_ENDPOINT_URL),
    S3_SECRET_ACCESS_KEY: normalizedValue(source.S3_SECRET_ACCESS_KEY),
  };

  if (!apiEnvironmentValidator.Check(candidate)) {
    const issues = Array.from(apiEnvironmentValidator.Errors(candidate))
      .map(({ message, path }) => `${path || "/"}: ${message}`)
      .join("\n- ");

    throw new Error(`Invalid API environment:\n- ${issues}`);
  }

  const decoded = apiEnvironmentValidator.Decode(candidate);

  return {
    ...decoded,
    NODE_ENV: decoded.NODE_ENV ?? "development",
    PORT: decoded.PORT ?? 3000,
    S3_FORCE_PATH_STYLE: decoded.S3_FORCE_PATH_STYLE ?? false,
  };
};
