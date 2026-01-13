import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SendMailToWinnerCommand } from "../implements/send-mail-to-winner.command";
import { ItemRepository } from "modules/items/repository/item.repository";
import { ItemEntity } from "modules/items/entities/item.entity";
import { DataSource } from "typeorm";
import { Inject, Logger } from "@nestjs/common";
import { NOTIFICATION_SERVICE_DI_TOKEN } from "modules/notification-service/notification-service.token";
import { ClientProxy } from "@nestjs/microservices";
import { NotificationCreateDto } from "modules/notification-service/dto/notification-create.dto";

@CommandHandler(SendMailToWinnerCommand)
export class SendMailToWinnerCommandHandler
  implements ICommandHandler<SendMailToWinnerCommand>
{
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly dataSource: DataSource,
    @Inject(NOTIFICATION_SERVICE_DI_TOKEN.NAME)
    private readonly client: ClientProxy,
  ) {}

  async execute(_: SendMailToWinnerCommand): Promise<void> {
    const now = new Date();

    const rawItems = await this.itemRepository.findItemsNotNotified(now);

    await Promise.all(
      rawItems.map((rawItem) =>
        this.dataSource.transaction(async (manager) => {
          const item = await manager.getRepository(ItemEntity).findOne({
            where: { id: rawItem.id },
            lock: { mode: "pessimistic_write" },
          });

          if (!item) return;

          const itemWithRelations = await manager
            .getRepository(ItemEntity)
            .findOne({
              where: { id: item.id },
              relations: { owner: true, winner: true },
            });

          if (!itemWithRelations || !itemWithRelations.winner) return;

          this.client.emit(
            NOTIFICATION_SERVICE_DI_TOKEN.CREATE_NOTI,
            new NotificationCreateDto(
              itemWithRelations.winner.id,
              "AUCTION_WON",
              {
                winnerName:
                  itemWithRelations.winner.firstName +
                  " " +
                  itemWithRelations.winner.lastName,
                itemName: itemWithRelations.name,
                description: itemWithRelations.description,
                startingPrice: itemWithRelations.startingPrice,
                finalPrice: itemWithRelations.finalPrice,
                startTime: itemWithRelations.startTime,
                endTime: itemWithRelations.endTime,
                ownerName:
                  itemWithRelations.owner.firstName +
                  " " +
                  itemWithRelations.owner.lastName,
                ownerEmail: itemWithRelations.owner.email,
              },
            ),
          );

          await manager
            .getRepository(ItemEntity)
            .update(item.id, { isWinnerNotified: true });
        }),
      ),
    );

    Logger.log(`Sent ${rawItems.length} email(s) to winners.`);
  }
}
