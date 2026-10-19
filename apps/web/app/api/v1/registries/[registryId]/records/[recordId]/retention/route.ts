import { presentRecordDetail } from "@civic-registry/registry";
import { publicRetentionStatus } from "../../../../../../../../lib/retention-public";
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
  return publicApiJson({
    registryId,
    recordId,
    ...publicRetentionStatus(presented.fields),
  });
}
