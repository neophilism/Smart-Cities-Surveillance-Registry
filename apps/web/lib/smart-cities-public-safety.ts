import type {
  CompiledRegistryConfig,
} from "@civic-registry/config";
import type {
  RegistryRecord,
} from "@civic-registry/core";
import type {
  PublicRecordProjection,
} from "@civic-registry/registry";

export const SMART_CITIES_REGISTRY_ID =
  "smart-cities-surveillance-registry";

export type SmartCitiesPublicSafetyIssueCode =
  | "forbidden_public_field"
  | "precise_coordinates"
  | "private_network_address"
  | "hardware_address"
  | "private_key_material"
  | "credential_material"
  | "individual_target_identifier"
  | "personal_surveillance_identifier";

export interface SmartCitiesPublicSafetyIssue {
  path: string;
  code: SmartCitiesPublicSafetyIssueCode;
  message: string;
}

const FORBIDDEN_PUBLIC_FIELD_IDS = new Set([
  "latitude",
  "longitude",
  "coordinates",
  "gps_coordinates",
  "device_ip",
  "ip_address",
  "mac_address",
  "ssid",
  "bssid",
  "username",
  "password",
  "api_key",
  "access_token",
  "client_secret",
  "secret",
  "device_id",
  "serial_number",
  "target_person",
  "target_name",
  "target_id",
  "subject_id",
  "person_id",
  "biometric_template",
  "raw_surveillance_data",
]);

const MAC_ADDRESS =
  /(^|[^0-9a-f])(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}([^0-9a-f]|$)/i;
const PRIVATE_KEY =
  /-----BEGIN\s+(?:(?:RSA|EC|OPENSSH)\s+)?PRIVATE KEY-----/i;
const CREDENTIAL_ASSIGNMENT =
  /(password|passwd|api[ _-]?key|access[ _-]?token|client[ _-]?secret|bearer)\s*[:=]\s*[^\s,;]{8,}/i;
const TARGET_IDENTIFIER =
  /(target|subject|person)[ _-]?(id|identifier|name)\s*[:=]\s*[^\s,;]{2,}/i;
const LICENSE_PLATE =
  /(license[ _-]?plate|plate)\s*[:=]\s*[A-Z0-9-]{4,12}([^A-Z0-9-]|$)/i;
const BIOMETRIC_IDENTIFIER =
  /(biometric[ _-]?(template|identifier)|face[ _-]?template)\s*[:=]/i;
const LABELED_COORDINATES =
  /(?:latitude|lat)\s*[:=]\s*([-+]?\d{1,2}\.\d{4,})[^\d]+(?:longitude|lon|lng)\s*[:=]\s*([-+]?\d{1,3}\.\d{4,})/i;
const GPS_COORDINATES =
  /(?:gps|coordinates?)\s*[:=]\s*([-+]?\d{1,2}\.\d{4,})\s*,\s*([-+]?\d{1,3}\.\d{4,})/i;
const PRECISE_COORDINATE_PAIR =
  /(^|[^\d])([-+]?\d{1,2}\.\d{4,})\s*,\s*([-+]?\d{1,3}\.\d{4,})([^\d]|$)/;

function isPrivateIpv4(
  value: string,
): boolean {
  const matches =
    value.match(
      /(^|[^\d])((?:\d{1,3}\.){3}\d{1,3})([^\d]|$)/g,
    ) ?? [];

  for (const match of matches) {
    const ip = match
      .replace(/^[^\d]+/, "")
      .replace(/[^\d]+$/, "");
    const octets = ip
      .split(".")
      .map((part) => Number(part));

    if (
      octets.length !== 4 ||
      octets.some(
        (octet) =>
          !Number.isInteger(octet) ||
          octet < 0 ||
          octet > 255,
      )
    ) {
      continue;
    }

    const [a, b] = octets;

    if (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }

  return false;
}

function isPrivateIpv6(
  value: string,
): boolean {
  return /(^|[^0-9a-f])(?:fe8|fe9|fea|feb|fc|fd)[0-9a-f]*:/i.test(
    value,
  );
}

function validCoordinate(
  latitudeText: string,
  longitudeText: string,
): boolean {
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function coordinateIssue(
  value: string,
  fieldId: string,
): boolean {
  for (const pattern of [
    LABELED_COORDINATES,
    GPS_COORDINATES,
  ]) {
    const match = value.match(pattern);

    if (
      match &&
      validCoordinate(match[1], match[2])
    ) {
      return true;
    }
  }

  if (fieldId === "public_location_scope") {
    const pair =
      value.match(PRECISE_COORDINATE_PAIR);

    if (
      pair &&
      validCoordinate(pair[2], pair[3])
    ) {
      return true;
    }
  }

  return false;
}

function scanString(
  value: string,
  path: string,
  fieldId: string,
): SmartCitiesPublicSafetyIssue[] {
  const issues: SmartCitiesPublicSafetyIssue[] = [];

  if (coordinateIssue(value, fieldId)) {
    issues.push({
      path,
      code: "precise_coordinates",
      message:
        "Precise device or operational coordinates must not be published.",
    });
  }

  if (
    isPrivateIpv4(value) ||
    isPrivateIpv6(value)
  ) {
    issues.push({
      path,
      code: "private_network_address",
      message:
        "Private or link-local network addresses must not be published.",
    });
  }

  if (MAC_ADDRESS.test(value)) {
    issues.push({
      path,
      code: "hardware_address",
      message:
        "Hardware addresses must not be published.",
    });
  }

  if (PRIVATE_KEY.test(value)) {
    issues.push({
      path,
      code: "private_key_material",
      message:
        "Private-key material must not be published.",
    });
  }

  if (
    /:\/\/[^\s/@:]+:[^\s/@]+@/.test(
      value,
    )
  ) {
    issues.push({
      path,
      code: "credential_material",
      message:
        "URLs containing embedded credentials must not be published.",
    });
  }

  if (CREDENTIAL_ASSIGNMENT.test(value)) {
    issues.push({
      path,
      code: "credential_material",
      message:
        "Credentials, API keys, access tokens, and secrets must not be published.",
    });
  }

  if (TARGET_IDENTIFIER.test(value)) {
    issues.push({
      path,
      code: "individual_target_identifier",
      message:
        "Individual target identifiers must not be published.",
    });
  }

  if (
    LICENSE_PLATE.test(value) ||
    BIOMETRIC_IDENTIFIER.test(value)
  ) {
    issues.push({
      path,
      code: "personal_surveillance_identifier",
      message:
        "Raw personal surveillance identifiers must not be published.",
    });
  }

  return issues;
}

function scanValue(
  value: unknown,
  path: string,
  fieldId: string,
): SmartCitiesPublicSafetyIssue[] {
  if (typeof value === "string") {
    return scanString(
      value,
      path,
      fieldId,
    );
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scanValue(
        entry,
        `${path}[${index}]`,
        fieldId,
      ),
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.entries(value).flatMap(
      ([key, entry]) => {
        const normalized = key.toLowerCase();

        if (
          FORBIDDEN_PUBLIC_FIELD_IDS.has(
            normalized,
          )
        ) {
          return [
            {
              path: `${path}.${key}`,
              code:
                "forbidden_public_field" as const,
              message:
                "Operationally sensitive structured fields must not be published.",
            },
          ];
        }

        return scanValue(
          entry,
          `${path}.${key}`,
          normalized,
        );
      },
    );
  }

  return [];
}

export function scanSmartCitiesPublicPayload(
  value: unknown,
  path = "payload",
): SmartCitiesPublicSafetyIssue[] {
  return scanValue(
    value,
    path,
    "payload",
  );
}

export function scanSmartCitiesPublicRecord(
  record: RegistryRecord,
  options: {
    protectedFieldIds?: Iterable<string>;
  } = {},
): SmartCitiesPublicSafetyIssue[] {
  if (
    record.registryId !==
    SMART_CITIES_REGISTRY_ID
  ) {
    return [];
  }

  const protectedFieldIds = new Set(
    options.protectedFieldIds ?? [],
  );
  const issues: SmartCitiesPublicSafetyIssue[] = [];

  for (const [fieldId, value] of Object.entries(
    record.fields,
  )) {
    if (protectedFieldIds.has(fieldId)) {
      continue;
    }

    const normalized =
      fieldId.toLowerCase();

    if (
      FORBIDDEN_PUBLIC_FIELD_IDS.has(
        normalized,
      )
    ) {
      issues.push({
        path: `record.fields.${fieldId}`,
        code: "forbidden_public_field",
        message:
          "Operationally sensitive fields must not be published.",
      });
      continue;
    }

    issues.push(
      ...scanValue(
        value,
        `record.fields.${fieldId}`,
        normalized,
      ),
    );
  }

  for (
    const [index, identifier] of
    (record.externalIdentifiers ?? [])
      .entries()
  ) {
    const scheme =
      identifier.scheme.toLowerCase();

    if (
      FORBIDDEN_PUBLIC_FIELD_IDS.has(
        scheme,
      ) ||
      /(target|subject|person|device|mac|ip|credential|secret|token)/i.test(
        scheme,
      )
    ) {
      issues.push({
        path:
          `record.externalIdentifiers[${index}]`,
        code: "forbidden_public_field",
        message:
          "Sensitive operational or target identifiers must not be published as external identifiers.",
      });
      continue;
    }

    issues.push(
      ...scanString(
        identifier.value,
        `record.externalIdentifiers[${index}].value`,
        scheme,
      ),
    );
  }

  for (
    const [index, tag] of
    (record.tags ?? []).entries()
  ) {
    issues.push(
      ...scanString(
        tag,
        `record.tags[${index}]`,
        "tag",
      ),
    );
  }

  return issues;
}

export class SmartCitiesPublicSafetyError
  extends Error {
  readonly issues:
    SmartCitiesPublicSafetyIssue[];

  constructor(
    issues: SmartCitiesPublicSafetyIssue[],
  ) {
    super(
      "Smart Cities public-safety review failed: " +
        issues
          .map(
            (issue) =>
              `${issue.path} (${issue.code})`,
          )
          .join(", "),
    );
    this.name =
      "SmartCitiesPublicSafetyError";
    this.issues = issues;
  }
}

export function assertSmartCitiesPublicRecordSafe(
  record: RegistryRecord,
  options: {
    protectedFieldIds?: Iterable<string>;
  } = {},
): void {
  const issues =
    scanSmartCitiesPublicRecord(
      record,
      options,
    );

  if (issues.length > 0) {
    throw new SmartCitiesPublicSafetyError(
      issues,
    );
  }
}

export function applySmartCitiesPublicSafetyFallback(
  registry: CompiledRegistryConfig,
  projection: PublicRecordProjection,
): PublicRecordProjection {
  if (
    registry.definition.id !==
      SMART_CITIES_REGISTRY_ID ||
    !projection.record
  ) {
    return projection;
  }

  const issues =
    scanSmartCitiesPublicRecord(
      projection.record,
    );

  if (issues.length === 0) {
    return projection;
  }

  const recordType =
    registry.getRecordType(
      projection.record.recordTypeId,
    );
  const fields: RegistryRecord["fields"] = {
    [recordType.definition.titleFieldId]:
      "Record withheld for public-safety review",
  };

  if (
    recordType.definition.summaryFieldId
  ) {
    fields[
      recordType.definition.summaryFieldId
    ] =
      "Public contents are temporarily withheld because the automated safety boundary detected potentially sensitive operational or personal data.";
  }

  return {
    record: {
      ...projection.record,
      fields,
      externalIdentifiers: [],
      tags: [],
    },
    disclosure: {
      disposition: "withheld",
      fields: {},
      reason:
        "Automated public-safety boundary",
      publicNote:
        "This record requires disclosure review before its contents can be shown publicly.",
    },
  };
}
