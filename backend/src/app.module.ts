import { join } from "node:path";

import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { PassportModule } from "@nestjs/passport";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from "typeorm-transactional";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmConfigService } from "./database/typeorm-config.service";
import { JwtAuthGuard } from "./decorator/jwt-auth-guard";
import { LoggingExceptionFilter } from "./filter/error-handling-exception-filter";
import { RolesGuard } from "./guards/roles.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { KeycloakModule } from "./modules/keycloak/keycloak.module";
import { UserModule } from "./modules/user/user.module";
import { ApiConfigService } from "./shared/services/api-config.service";
import { SharedModule } from "./shared/shared.module";
import { ItemsModule } from "modules/items/items.module";
import { BidsModule } from "modules/bids/bids.module";
import { PdfModule } from "./modules/pdf/pdf.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { MailerConfigService } from "shared/services/mailer-config.service";
import { MailModule } from "./modules/mail/mail.module";
import { ScheduleModule } from "@nestjs/schedule";
import { MediaServiceModule } from "./modules/media-service/media-service.module";
import { NotificationServiceModule } from "./modules/notification-service/notification-service.module";

@Module({
  imports: [
    CqrsModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    SharedModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public"),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [SharedModule],
      useClass: TypeOrmConfigService,
      inject: [ApiConfigService],
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error("Invalid options passed");
        }

        const existingDataSource = getDataSourceByName("default");
        if (existingDataSource && existingDataSource.isInitialized) {
          return existingDataSource;
        }

        const dataSource = new DataSource(options);
        return addTransactionalDataSource(dataSource);
      },
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    AuthModule,
    UserModule,
    KeycloakModule,
    ItemsModule,
    BidsModule,
    PdfModule,
    MailerModule.forRootAsync({
      useFactory: (mailerConfigService: MailerConfigService) =>
        mailerConfigService.mailerConfig(),
      inject: [MailerConfigService],
    }),
    MailModule,
    ScheduleModule.forRoot(),
    MediaServiceModule,
    NotificationServiceModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: LoggingExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
