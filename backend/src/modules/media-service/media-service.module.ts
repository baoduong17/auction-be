import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { MediaService } from "./media-service.token";
import { ApiConfigService } from "shared/services/api-config.service";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        inject: [ApiConfigService],
        name: MediaService.name,
        useFactory: async (configService: ApiConfigService) => {
          return {
            transport: Transport.RMQ,
            options: {
              urls: [configService.rabbitMqUrl],
              queue: 'media_queue',
              queueOptions: {
                durable: false,
              }
            },
          }
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MediaServiceModule { }
