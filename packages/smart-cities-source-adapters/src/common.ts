import {
  stableSlug,
  type SourceAdapterRow,
} from "@civic-registry/source-adapters";

export type ProviderValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined;

export interface ProviderRowMapping {
  recordIdField: string;
  titleField: string;
  externalIdField?: string;
  canonicalUrlField?: string;
  fieldMap?: Record<string, string>;
}

export function objectValue(
  value: unknown,
): Record<string, unknown> | undefined {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function pathValue(
  object: Record<string, unknown>,
  path: string,
): unknown {
  const segments =
    path.match(/[^.[\]]+/g) ?? [];
  let current: unknown = object;

  for (const segment of segments) {
    const container =
      objectValue(current);

    if (!container) {
      return undefined;
    }

    current = container[segment];
  }

  return current;
}

export function providerValue(
  value: unknown,
): ProviderValue {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    )
  ) {
    return value.map(String);
  }

  return JSON.stringify(value);
}

function scalar(
  value: unknown,
): string | undefined {
  const normalized =
    providerValue(value);

  if (
    typeof normalized === "string" ||
    typeof normalized === "number" ||
    typeof normalized === "boolean"
  ) {
    const result =
      String(normalized).trim();

    return result || undefined;
  }

  return undefined;
}

export function mapProviderObject(
  raw: Record<string, unknown>,
  mapping: ProviderRowMapping,
  context: {
    adapterId: string;
    retrievedAt: string;
    sourceUrl: string;
  },
): SourceAdapterRow | undefined {
  const recordId = scalar(
    pathValue(
      raw,
      mapping.recordIdField,
    ),
  );
  const title = scalar(
    pathValue(
      raw,
      mapping.titleField,
    ),
  );

  if (!recordId || !title) {
    return undefined;
  }

  const externalId =
    scalar(
      mapping.externalIdField
        ? pathValue(
            raw,
            mapping.externalIdField,
          )
        : recordId,
    ) ?? recordId;
  const explicitCanonical =
    mapping.canonicalUrlField
      ? scalar(
          pathValue(
            raw,
            mapping.canonicalUrlField,
          ),
        )
      : undefined;
  const canonicalUrl =
    explicitCanonical ??
    context.sourceUrl.replace(
      /#.*$/,
      "",
    ) +
      "#record-" +
      encodeURIComponent(
        stableSlug(externalId) ||
          externalId,
      );

  const row: SourceAdapterRow = {
    id:
      stableSlug(
        context.adapterId +
          "-" +
          recordId,
      ) || recordId,
    external_id: externalId,
    title,
    canonical_url: canonicalUrl,
    source_adapter:
      context.adapterId,
    retrieved_at:
      context.retrievedAt,
  };

  for (
    const [target, source] of
    Object.entries(
      mapping.fieldMap ?? {},
    )
  ) {
    const value = providerValue(
      pathValue(raw, source),
    );

    if (value !== undefined) {
      row[target] = value;
    }
  }

  return row;
}

export function parseJson(
  source: string,
  label: string,
): unknown {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(
      label +
        " returned invalid JSON: " +
        (
          error instanceof Error
            ? error.message
            : "parse error"
        ),
    );
  }
}
