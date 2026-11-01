import { toUrlSearchParams, type PublicSearchParams } from "./search-params.ts";

export function paginationHref(basePath: string, params: PublicSearchParams, page: number, resultsId?: string): string {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error("Result page must be a positive integer.");
  const query = toUrlSearchParams(params, { page });
  return `${basePath}?${query.toString()}` + (resultsId ? "#" + encodeURIComponent(resultsId) : "");
}

export function searchResultRange(total: number, page: number, pageSize: number): string {
  if (total === 0) return "No matching public records.";
  const first = (page - 1) * pageSize + 1;
  if (first > total) return `No records on this page. ${total} matching public records are available on earlier pages.`;
  return `Showing records ${first} to ${Math.min(total, first + pageSize - 1)} of ${total}.`;
}
