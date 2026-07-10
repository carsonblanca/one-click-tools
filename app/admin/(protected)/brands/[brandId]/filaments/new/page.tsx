import { notFound } from "next/navigation";
import { requireAdminScope } from "@/lib/admin/auth";
import { getManualBrand } from "@/lib/filaments/manual-filament-types";
import { manualParameterTemplate } from "@/lib/filaments/manual-parameter-template";
import ManualFilamentForm from "./ManualFilamentForm";

export default async function NewManualFilamentPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  await requireAdminScope("display.draft.create");
  const { brandId } = await params;
  const brand = getManualBrand(brandId);
  if (!brand) notFound();

  return (
    <ManualFilamentForm
      brand={brand}
      parameterTemplate={manualParameterTemplate}
    />
  );
}
