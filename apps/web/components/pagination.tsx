import Link from "next/link";

import {
  type PublicSearchParams,
} from "../lib/search-params";
import { paginationHref } from "../lib/pagination";

export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
  resultsId,
}: {
  basePath: string;
  params: PublicSearchParams;
  page: number;
  pageSize: number;
  total: number;
  resultsId?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  if (pages <= 1) return null;

  const hrefFor = (targetPage: number) => {
    return paginationHref(basePath, params, targetPage, resultsId);
  };

  return (
    <nav
      className="pagination"
      aria-label="Search result pages"
    >
      <div>
        {page > 1 ? (
          <Link prefetch={false} rel="prev" aria-label={`Previous result page, page ${page - 1}`} href={hrefFor(page - 1)}>← Previous</Link>
        ) : (
          <span aria-disabled="true">← Previous</span>
        )}
      </div>
      <span aria-current="page">
        Page {page} of {pages}
      </span>
      <div>
        {page < pages ? (
          <Link prefetch={false} rel="next" aria-label={`Next result page, page ${page + 1}`} href={hrefFor(page + 1)}>Next →</Link>
        ) : (
          <span aria-disabled="true">Next →</span>
        )}
      </div>
    </nav>
  );
}
