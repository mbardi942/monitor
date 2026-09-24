import React from "react";
import { ReportDetailClient } from "./ReportDetailClient";

interface PageProps {
  params: Promise<{ dashboardId: string; id: string }>;
}

export default async function ReportDetailPage(props: PageProps) {
  const { id } = await props.params;
  return <ReportDetailClient reportId={id} />;
}
