import React from "react";
import { GatewayProvider } from "@/context/gateway-context";
import { ToastProvider } from "@/shared/components/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <GatewayProvider>{children}</GatewayProvider>
    </ToastProvider>
  );
}
