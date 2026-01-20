import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { NOTIFICATION_SERVICE_DI_TOKEN } from "./notification-service.token";
import { ApiConfigService } from "shared/services/api-config.service";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_SERVICE_DI_TOKEN.NAME,
        inject: [ApiConfigService],
        useFactory: async (apiConfigService: ApiConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [apiConfigService.rabbitMqUrl],
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
export class NotificationServiceModule { }
