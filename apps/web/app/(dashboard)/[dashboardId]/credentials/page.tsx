import React from "react";
import { getAuthProfilesForDashboard } from "@/core/services/auth-profile-query-service";
import { getDashboards } from "@/core/services/dashboard-query-service";
import { CredentialsClient } from "./CredentialsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ dashboardId: string }>;
}

export default async function CredentialsPage({ params }: PageProps) {
  const { dashboardId } = await params;
  const [credentials, dashboards] = await Promise.all([
    getAuthProfilesForDashboard(dashboardId),
    getDashboards(),
  ]);

  return (
    <CredentialsClient
      dashboardId={dashboardId}
      initialCredentials={credentials}
      dashboards={dashboards}
    />
  );
}
