import { Module } from "@nestjs/common";
import { BidsController } from "./bids.controller";
import { PlaceBidOnItemCommandHandler } from "./cqrs/commands/handlers/place-bid-on-item.command.handler";
import { BidRepository } from "./repository/bid.repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BidEntity } from "./entities/bid.entity";
import { CqrsModule } from "@nestjs/cqrs";
import { UserModule } from "modules/user/user.module";
import { ItemsModule } from "../items/items.module";
import { GetMyBidsQueryHandler } from "./cqrs/queries/handlers/get-my-bids.query.handler";
import { NotificationServiceModule } from "modules/notification-service/notification-service.module";

const commandsHandlers = [PlaceBidOnItemCommandHandler];
const queriesHandlers = [GetMyBidsQueryHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([BidEntity]),
    CqrsModule,
    UserModule,
    ItemsModule,
    NotificationServiceModule,
  ],
  controllers: [BidsController],
  providers: [...commandsHandlers, ...queriesHandlers, BidRepository],
})
export class BidsModule {}
