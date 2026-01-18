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
          const url = configService.rabbitMqUrl;
          return {
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue: 'media_queue',
            },
          }
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MediaServiceModule { }
