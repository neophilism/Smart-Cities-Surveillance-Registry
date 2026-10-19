import { presentRecordDetail } from "@civic-registry/registry";
import { getPublicRecordView, getPublicRegistry } from "../../../../../../../../lib/public-registry";
import { publicApiError, publicApiJson, publicApiOptions } from "../../../../../../../../lib/public-api";

export const dynamic = "force-dynamic";
export const OPTIONS = publicApiOptions;

export async function GET(
  _request: Request,
  context: { params: Promise<{ registryId: string; recordId: string }> },
) {
  const { registryId, recordId } = await context.params;
  const [registry, view] = await Promise.all([
    getPublicRegistry(registryId),
    getPublicRecordView(registryId, recordId),
  ]);
  if (!registry) return publicApiError(404, "registry_not_found", "Registry not found.");
  if (!view) return publicApiError(404, "record_not_found", "Public record not found.");
  if (view.record.recordTypeId !== "deployment") {
    return publicApiError(404, "retention_not_applicable", "Retention projection is not applicable.");
  }
  const presented = presentRecordDetail(view.record, registry.config, view.disclosure);
  const field = (id: string) => presented.fields.find(
    candidate => candidate.id === id && !candidate.empty
  )?.displayValue ?? null;
  return publicApiJson({
    registryId,
    recordId,
    publishedMaximumRetentionDays: field("retention_days"),
    publishedRetentionBasis: field("retention_basis"),
    actualDeletionVerified: false,
    evidenceStatus: "not_verified",
    explanation: "Published retention conditions and provider statements do not prove physical deletion.",
  });
}
