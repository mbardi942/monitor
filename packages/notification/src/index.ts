// ID & Aggregates
export { RecipientListId, RecipientId, RecipientList, Recipient, NotificationChannel, NotificationChannelProps, RecipientProps, RecipientListProps } from "./domain/model/recipient-list.js";
export { NotificationId, DeliveryAttemptId, Notification, DeliveryAttempt, DeliveryAttemptProps, NotificationProps } from "./domain/model/notification.js";

// Ports
export { RecipientListRepository } from "./domain/ports/recipient-list-repository.js";
export { NotificationRepository } from "./domain/ports/notification-repository.js";
export { EmailSender, SlackSender } from "./domain/ports/notification-sender.js";
export { RecipientQueryRepository, RecipientDTO, AddRecipientData } from "./domain/ports/recipient-query-repository.js";

// Domain Services
export { NotificationRoutingService } from "./domain/services/notification-routing-service.js";

// ACL Translators
export { AlarmConfirmedTranslator, NotificationRequest } from "./infrastructure/acl/alarm-confirmed-translator.js";
export { AlarmResolvedTranslator } from "./infrastructure/acl/alarm-resolved-translator.js";
export { ReportConfirmedTranslator } from "./infrastructure/acl/report-confirmed-translator.js";

// Use Cases
export { DeliverNotificationUseCase } from "./application/use-cases/deliver-notification.js";

// Event Handlers
export { OnAlarmConfirmed } from "./application/event-handlers/on-alarm-confirmed.js";
export { OnAlarmResolved } from "./application/event-handlers/on-alarm-resolved.js";
export { OnReportConfirmed } from "./application/event-handlers/on-report-confirmed.js";

// Domain Events
export { NotificationDelivered } from "./domain/events/notification-delivered.js";

// Infrastructure Adapters
export { DrizzleRecipientListRepository } from "./infrastructure/persistence/drizzle-recipient-list-repository.js";
export { DrizzleNotificationRepository } from "./infrastructure/persistence/drizzle-notification-repository.js";
export { ResendEmailSender } from "./infrastructure/adapters/resend-email-sender.js";
export { SlackWebhookSender } from "./infrastructure/adapters/slack-webhook-sender.js";
export { DrizzleRecipientQueryRepository } from "./infrastructure/persistence/drizzle-recipient-query-repository.js";
