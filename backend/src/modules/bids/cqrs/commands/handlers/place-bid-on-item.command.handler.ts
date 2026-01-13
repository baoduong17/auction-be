import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { PlaceBidOnItemCommand } from "../implements/place-bid-on-item.command";
import { BidRepository } from "modules/bids/repository/bid.repository";
import { UserRepository } from "modules/user/repository/user.repository";
import { ItemRepository } from "modules/items/repository/item.repository";
import { BidDomainValidation } from "modules/bids/domain/bid-domain.validation";
import { DataSource } from "typeorm";
import { Inject } from "@nestjs/common";
import { NOTIFICATION_SERVICE_DI_TOKEN } from "modules/notification-service/notification-service.token";
import { ClientProxy } from "@nestjs/microservices";
import { NotificationCreateDto } from "modules/notification-service/dto/notification-create.dto";

@CommandHandler(PlaceBidOnItemCommand)
export class PlaceBidOnItemCommandHandler
  implements ICommandHandler<PlaceBidOnItemCommand>
{
  constructor(
    private readonly bidRepository: BidRepository,
    private readonly userRepository: UserRepository,
    private readonly itemRepository: ItemRepository,
    private readonly dataSource: DataSource,
    @Inject(NOTIFICATION_SERVICE_DI_TOKEN.NAME)
    private readonly client: ClientProxy,
  ) {}

  async execute(command: PlaceBidOnItemCommand): Promise<void> {
    const user = await this.userRepository.findByIdOrThrow(command.userId);

    const item = await this.itemRepository.findByIdOrThrow(command.itemId);

    const highestBid = await this.bidRepository.findByItemId(command.itemId);

    BidDomainValidation.ensureBiddingPeriodValid(item.startTime, item.endTime);

    BidDomainValidation.ensureNotOwner(item.ownerId, command.userId);

    BidDomainValidation.ensureBidPriceValid(
      command.price,
      item.startingPrice,
      highestBid?.price,
    );

    await this.dataSource.transaction(async () => {
      await this.bidRepository.create(command);
      await this.itemRepository.create({
        ...item,
        winner: user,
        winnerId: user.id,
        finalPrice: command.price,
      });

      this.client.emit(
        NOTIFICATION_SERVICE_DI_TOKEN.CREATE_NOTI,
        new NotificationCreateDto(item.ownerId, "BID_NOTIFICATION", {
          bidAmount: command.price,
          bidderName: user.firstName + " " + user.lastName,
          itemName: item.name,
          actionUrl: "http://localhost:5173/items/" + item.id,
        }),
      );
    });
  }
}
