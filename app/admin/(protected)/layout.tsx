import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/auth";
import AdminShell from "../components/AdminShell";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();
  return (
    <AdminShell role={session.role} sessionId={session.sessionId.slice(0, 8)}>
      {children}
    </AdminShell>
  );
}
