import { NextRequest, NextResponse } from "next/server";
import { hasAdminScope } from "@/lib/admin/permissions";
import { readAdminSession } from "@/lib/admin/session";
import {
  createFilamentEvidenceDraft,
  listFilamentEvidenceDrafts,
  type EvidenceTargetBinding,
} from "@/lib/filaments/evidence/evidence-draft-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.view")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ drafts: await listFilamentEvidenceDrafts() });
}

export async function POST(request: NextRequest) {
  const session = await readAdminSession();
  if (!session || !hasAdminScope(session.role, "candidate.create")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const sourceImage = form.get("sourceImage");
    const payloadText = String(form.get("payload") || "");
    if (!(sourceImage instanceof File) || !payloadText) {
      return NextResponse.json({ error: "原始图片和标注数据不能为空。" }, { status: 400 });
    }
    if (!/^image\/(png|jpeg|webp)$/i.test(sourceImage.type) || sourceImage.size <= 0) {
      return NextResponse.json({ error: "原始图片格式无效。" }, { status: 400 });
    }
    const payload = JSON.parse(payloadText) as {
      targetBinding?: EvidenceTargetBinding;
      sourceType?: string;
      sourceOrigin?: string;
      sourceImageName?: string;
      titleEvidence?: Record<string, unknown>;
      annotations?: Array<Record<string, unknown>>;
      cardCount?: number;
    };
    const binding = payload.targetBinding;
    if (!binding?.brandId || !(binding.productLineId || binding.filamentId) ||
        !binding.materialType || !binding.evidenceType) {
      return NextResponse.json({ error: "目标绑定不完整。" }, { status: 400 });
    }
    const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
    const cardCount = Number(payload.cardCount || 0);
    if (!cardCount || annotations.length !== cardCount) {
      return NextResponse.json({ error: "色卡标注数量不一致。" }, { status: 400 });
    }
    const extension = sourceImage.type === "image/png" ? "png" : sourceImage.type === "image/webp" ? "webp" : "jpg";
    const draft = await createFilamentEvidenceDraft({
      targetBinding: {
        ...binding,
        selectedBy: session.actorId,
        selectedAt: binding.selectedAt || new Date().toISOString(),
      },
      sourceType: String(payload.sourceType || "file_upload"),
      sourceOrigin: String(payload.sourceOrigin || "local_file"),
      sourceImageName: String(payload.sourceImageName || sourceImage.name),
      sourceImage: Buffer.from(await sourceImage.arrayBuffer()),
      sourceImageExtension: extension,
      titleEvidence: payload.titleEvidence || {},
      annotations,
      cardCount,
      actorId: session.actorId,
    });
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存证据草稿失败。" },
      { status: 500 },
    );
  }
}
