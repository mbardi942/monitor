"use client";

import React from "react";
import { CredentialsList } from "@/features/credentials/components/CredentialsList";
import { AuthProfileDTO } from "@monitor/monitoring";
import { DashboardDTO } from "@/core/ports/gateways";

interface CredentialsClientProps {
  dashboardId: string;
  initialCredentials: AuthProfileDTO[];
  dashboards: DashboardDTO[];
}

export function CredentialsClient({
  dashboardId,
  initialCredentials,
  dashboards,
}: CredentialsClientProps) {
  return (
    <CredentialsList
      dashboardId={dashboardId}
      credentials={initialCredentials}
      dashboards={dashboards}
    />
  );
}
