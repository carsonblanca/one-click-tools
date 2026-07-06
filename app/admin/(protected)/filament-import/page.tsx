import { requireAdminScope } from "@/lib/admin/auth";
import FilamentEvidenceImportClient from "./FilamentEvidenceImportClient";

export default async function FilamentEvidenceImportPage() {
  const session = await requireAdminScope("display.view");
  return (
    <div className="space-y-6">
      <FilamentEvidenceImportClient role={session.role} sessionId={session.sessionId.slice(0, 8)} />
    </div>
  );
}
