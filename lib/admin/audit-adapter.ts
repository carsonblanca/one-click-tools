import { randomUUID } from "node:crypto";
import type {
  AppendAuditInput,
  AppendOnlyAuditAdapter,
  AuditLogEntry,
} from "./audit";

declare global {
  var oneClickAdminAuditEntries: AuditLogEntry[] | undefined;
}

const entries =
  globalThis.oneClickAdminAuditEntries ??
  (globalThis.oneClickAdminAuditEntries = []);

class DevelopmentMemoryAuditAdapter implements AppendOnlyAuditAdapter {
  async append(input: AppendAuditInput) {
    const entry: AuditLogEntry = Object.freeze({
      ...input,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({ ...input.metadata }),
    });
    entries.push(entry);
    return entry;
  }

  async list() {
    return Object.freeze([...entries]);
  }
}

export const adminAudit = new DevelopmentMemoryAuditAdapter();

export const ADMIN_AUDIT_DEVELOPMENT_NOTICE =
  "仅用于开发演示，服务重启后日志不会保留；生产环境必须替换为 append-only 持久化存储。";
