import {
  extractLinks,
  type SourceAdapter,
  type SourceAdapterCollection,
  type SourceAdapterRunOptions,
} from "@civic-registry/source-adapters";

import {
  stableSlug,
} from "@civic-registry/source-adapters";

export interface HtmlDocumentCatalogAdapterConfig {
  id: string;
  label: string;
  allowedHosts: string[];
  startUrls: string[];
  linkPattern?: RegExp;
  documentExtensions?: string[];
}

function isDocumentLink(
  href: string,
  config: HtmlDocumentCatalogAdapterConfig,
): boolean {
  if (
    config.linkPattern &&
    config.linkPattern.test(href)
  ) {
    return true;
  }

  const pathname =
    new URL(href).pathname
      .toLowerCase();
  const extensions =
    config.documentExtensions ?? [
      ".pdf",
      ".csv",
      ".json",
      ".xlsx",
      ".xls",
      ".doc",
      ".docx",
    ];

  return extensions.some(
    (extension) =>
      pathname.endsWith(
        extension.toLowerCase(),
      ),
  );
}

function attachmentMediaType(
  href: string,
): string | undefined {
  const path =
    new URL(href).pathname
      .toLowerCase();

  if (path.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (path.endsWith(".csv")) {
    return "text/csv";
  }

  if (path.endsWith(".json")) {
    return "application/json";
  }

  return undefined;
}

export function createHtmlDocumentCatalogAdapter(
  config: HtmlDocumentCatalogAdapterConfig,
): SourceAdapter {
  return {
    id: config.id,
    label: config.label,
    allowedHosts: config.allowedHosts,
    defaultStartUrls:
      config.startUrls,

    async collect(
      client,
      options: SourceAdapterRunOptions = {},
    ): Promise<SourceAdapterCollection> {
      const retrievedAt =
        options.retrievedAt ??
        new Date().toISOString();
      const startUrls =
        options.startUrls ??
        config.startUrls;
      const maxItems =
        options.maxItems ?? 10_000;
      const maxPages = Math.min(
        options.maxPages ??
          startUrls.length,
        startUrls.length,
      );
      const rows = [];
      const sourcePages: string[] = [];
      const warnings = [];

      for (
        let index = 0;
        index < maxPages &&
        rows.length < maxItems;
        index += 1
      ) {
        const fetched =
          await client.fetchText(
            startUrls[index],
            config.allowedHosts,
          );
        sourcePages.push(
          fetched.finalUrl,
        );
        const links =
          extractLinks(
            fetched.body,
            fetched.finalUrl,
          );

        for (const link of links) {
          if (
            !isDocumentLink(
              link.href,
              config,
            )
          ) {
            continue;
          }

          let allowed = false;

          try {
            const host =
              new URL(
                link.href,
              ).hostname
                .toLowerCase();

            allowed =
              config.allowedHosts.some(
                (candidate) =>
                  candidate
                    .trim()
                    .toLowerCase() ===
                  host,
              );
          } catch {
            allowed = false;
          }

          if (!allowed) {
            warnings.push({
              code:
                "html_catalog_external_document",
              message:
                "Skipped a document link outside the adapter host allowlist.",
              url: link.href,
            });
            continue;
          }

          const url =
            new URL(link.href);
          const fallbackTitle =
            url.pathname
              .split("/")
              .filter(Boolean)
              .at(-1) ??
            "Public document";
          const linkText = link.text.trim();
          // Official document indexes frequently use "PDF" or "Download"
          // as every anchor label. Preserve descriptive link text, but
          // derive an informative title from the published filename when
          // the anchor is only a generic file-type action.
          const genericLinkText =
            /^(pdf|download( pdf)?|view( document)?|document|file|read)$/i.test(
              linkText,
            );
          const filenameTitle = decodeURIComponent(
            fallbackTitle,
          )
            .replace(/\.(pdf|csv|json|xlsx?|docx?)$/i, "")
            .replace(/[_-]+/g, " ")
            .trim();
          const title =
            linkText && !genericLinkText
              ? linkText
              : filenameTitle || "Public document";
          const externalId =
            url.pathname +
            url.search;
          const id =
            stableSlug(
              config.id +
                "-" +
                externalId,
            ) ||
            stableSlug(title);

          rows.push({
            id,
            external_id:
              externalId,
            title,
            canonical_url:
              url.toString(),
            source_adapter:
              config.id,
            retrieved_at:
              retrievedAt,
            attachment_urls: [
              url.toString(),
            ],
            media_type:
              attachmentMediaType(
                url.toString(),
              ),
          });

          if (
            rows.length >=
            maxItems
          ) {
            break;
          }
        }
      }

      return {
        rows,
        sourcePages,
        warnings,
      };
    },
  };
}
