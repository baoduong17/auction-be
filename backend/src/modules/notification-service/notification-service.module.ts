import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { NOTIFICATION_SERVICE_DI_TOKEN } from "./notification-service.token";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_SERVICE_DI_TOKEN.NAME,
        useFactory: async () => ({
          transport: Transport.RMQ,
          options: {
            queue: "notification_queue",
            queueOptions: {
              durable: false,
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class NotificationServiceModule {}
