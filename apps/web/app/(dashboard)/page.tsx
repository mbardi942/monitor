import React from "react";
import { redirect } from "next/navigation";
import { getDefaultDashboard } from "@/core/services/dashboard-query-service";

export const dynamic = "force-dynamic";

export default async function RootRedirectPage() {
  const defaultDash = await getDefaultDashboard();

  if (!defaultDash) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xs text-neutral-500 font-mono">Nessuna dashboard trovata.</p>
      </div>
    );
  }

  redirect(`/${defaultDash.id}`);
}
