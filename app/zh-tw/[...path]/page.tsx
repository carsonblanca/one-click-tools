import { redirect } from "next/navigation";

export default function TraditionalChineseFallbackPage() {
  redirect("/zh-tw");
}
