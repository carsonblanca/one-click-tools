import { redirect } from "next/navigation";

export default function SimplifiedChineseFallbackPage() {
  redirect("/zh-cn");
}
