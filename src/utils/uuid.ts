const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WATERMELON_ID_REGEX = /^[a-zA-Z0-9._-]{1,100}$/;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value);

export const isWatermelonLocalId = (value: unknown): boolean =>
  typeof value === 'string' &&
  WATERMELON_ID_REGEX.test(value) &&
  !isUuid(value);

export const resolveAuthProfileId = (
  candidate: unknown,
  authUserId: string,
): string => {
  if (isUuid(authUserId)) {
    return authUserId;
  }
  if (isUuid(candidate)) {
    return candidate;
  }
  return authUserId;
};

export const coerceAuthProfileId = (
  candidate: unknown,
  authUserId: string,
): string | null => {
  if (isUuid(authUserId)) {
    return authUserId;
  }
  if (isUuid(candidate)) {
    return candidate;
  }
  return null;
};
