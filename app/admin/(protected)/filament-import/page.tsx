import { requireAdminScope } from "@/lib/admin/auth";
import { listRecentFilamentImports } from "@/lib/filaments/imports/supabase-import-repository";
import EvidenceQueueClient from "./EvidenceQueueClient";
import FilamentEvidenceImportClient from "./FilamentEvidenceImportClient";

export default async function FilamentEvidenceImportPage() {
  const session = await requireAdminScope("display.view");
  const queuedImports = (await listRecentFilamentImports().catch(() => [])).map(
    (item) => ({
      id: item.id,
      sourceRunId: item.sourceRunId,
      brandId: item.brandId,
      originalFilename: item.originalFilename,
      status: item.status,
      createdAt: item.createdAt,
    }),
  );
  return (
    <div className="space-y-6">
      <EvidenceQueueClient initialImports={queuedImports} />
      <FilamentEvidenceImportClient role={session.role} sessionId={session.sessionId.slice(0, 8)} />
    </div>
  );
}
