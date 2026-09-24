import "server-only";
import { db, useMock } from "./backend-runtime";
import {
  DrizzleMonitorQueryRepository,
  DrizzleAlarmQueryRepository,
  DrizzleDashboardQueryRepository,
  DrizzleAuthProfileQueryRepository,
} from "@monitor/monitoring";
import { DrizzleRecipientQueryRepository } from "@monitor/notification";
import { DrizzleReportQueryRepository } from "@monitor/reporting";
import {
  MockMonitorQueryRepository,
  MockAlarmQueryRepository,
  MockReportQueryRepository,
  MockRecipientQueryRepository,
  MockDashboardQueryRepository,
  MockAuthProfileQueryRepository,
} from "./gateways/mock-query-repositories";

// Composition root di SOLA LETTURA: solo i query repository.
// Usato dai query service (SSR) e dalle API di polling, senza toccare
// il grafo dei comandi (Redis, scheduler, notifiche, event handler).
export const monitorQueryRepository = useMock
  ? new MockMonitorQueryRepository()
  : new DrizzleMonitorQueryRepository(db);

export const alarmQueryRepository = useMock
  ? new MockAlarmQueryRepository()
  : new DrizzleAlarmQueryRepository(db);

export const reportQueryRepository = useMock
  ? new MockReportQueryRepository()
  : new DrizzleReportQueryRepository(db);

export const recipientQueryRepository = useMock
  ? new MockRecipientQueryRepository()
  : new DrizzleRecipientQueryRepository(db);

export const dashboardQueryRepository = useMock
  ? new MockDashboardQueryRepository()
  : new DrizzleDashboardQueryRepository(db);

export const authProfileQueryRepository = useMock
  ? new MockAuthProfileQueryRepository()
  : new DrizzleAuthProfileQueryRepository(db);

