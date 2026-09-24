"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  DashboardGateway,
  MonitorGateway,
  AlarmGateway,
  ReportGateway,
  RecipientGateway,
} from '@/core/ports/gateways';
import {
  HttpDashboardGateway,
  HttpMonitorGateway,
  HttpAlarmGateway,
  HttpReportGateway,
  HttpRecipientGateway,
} from '@/infrastructure/gateways/http-gateways';

interface GatewayContextProps {
  dashboardGateway: DashboardGateway;
  monitorGateway: MonitorGateway;
  alarmGateway: AlarmGateway;
  reportGateway: ReportGateway;
  recipientGateway: RecipientGateway;
  useMock: boolean;
}

const GatewayContext = createContext<GatewayContextProps | undefined>(undefined);

export const GatewayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Controlla se la variabile d'ambiente è configurata per usare i mock
  // Impostiamo di default "true" se non specificata, per avviare subito in modalità sicura/mockata
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

  const gateways = useMemo<GatewayContextProps>(() => {
    return {
      dashboardGateway: new HttpDashboardGateway(),
      monitorGateway: new HttpMonitorGateway(),
      alarmGateway: new HttpAlarmGateway(),
      reportGateway: new HttpReportGateway(),
      recipientGateway: new HttpRecipientGateway(),
      useMock,
    };
  }, [useMock]);

  return <GatewayContext.Provider value={gateways}>{children}</GatewayContext.Provider>;
};

export const useGateways = () => {
  const context = useContext(GatewayContext);
  if (!context) {
    throw new Error("useGateways deve essere utilizzato all'interno di un GatewayProvider");
  }
  return context;
};

export const useDashboardGateway = () => useGateways().dashboardGateway;
export const useMonitorGateway = () => useGateways().monitorGateway;
export const useAlarmGateway = () => useGateways().alarmGateway;
export const useReportGateway = () => useGateways().reportGateway;
export const useRecipientGateway = () => useGateways().recipientGateway;
