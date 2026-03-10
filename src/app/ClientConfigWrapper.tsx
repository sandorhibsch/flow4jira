"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getJiraConfigFromLocalStorage } from "@/lib/repositories/jira-config.local.repository";

export function ClientConfigWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith("/jira-config")) return;
    const config = getJiraConfigFromLocalStorage();
    if (!config) {
      router.replace("/jira-config");
    }
  }, [pathname, router]);
  return <>{children}</>;
}
