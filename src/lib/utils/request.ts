/** Collapse URLSearchParams into a plain object for Zod query schemas. */
export function searchParamsToObject(params: URLSearchParams) {
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== "") result[key] = value;
  }
  return result;
}

/**
 * Next.js gives page components `searchParams` where a repeated key becomes an
 * array. Pages only ever use single values, so the first one wins.
 */
export function normaliseSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single !== undefined && single !== "") result[key] = single;
  }
  return result;
}

/** Build a query string, dropping empty values, for filter links. */
export function buildQueryString(
  params: Record<string, string | number | undefined | null>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
