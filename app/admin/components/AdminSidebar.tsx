"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavigationItems } from "../navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col gap-1">
      {adminNavigationItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
            isActive(item.href)
              ? "bg-[#E6F0FA] text-[#1F5FAF]"
              : "text-[#667281] hover:bg-[#F4F6F8] hover:text-[#18202A]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
