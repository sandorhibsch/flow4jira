"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getJiraConfigFromLocalStorage } from "@/lib/repositories/jira-config.local.repository";
import { isServerPersistenceMode } from "@/lib/repositories/client/board-config-client-factory";

export function ClientConfigWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith("/jira-config")) return;
    if (isServerPersistenceMode()) return;
    const config = getJiraConfigFromLocalStorage();
    if (!config) {
      router.replace("/jira-config");
    }
  }, [pathname, router]);
  return <>{children}</>;
}
