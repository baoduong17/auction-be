import { InjectRepository } from "@nestjs/typeorm";
import { ItemEntity } from "../entities/item.entity";
import { DataSource, IsNull, LessThan, Like, Not, Repository } from "typeorm";
import { Uuid } from "common/types";
import { NotFoundException } from "@nestjs/common";
import { MoreThanOrEqual, LessThanOrEqual } from "typeorm";
import { GetStatisticByUserIdDto } from "../dto/get-statitstic-by-user-id.dto";

export class ItemRepository {
  constructor(
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    private readonly dataSource: DataSource,
  ) { }

  async create(item: Partial<ItemEntity>): Promise<ItemEntity> {
    return await this.itemRepository.save(this.itemRepository.create(item));
  }

  async findById(id: Uuid): Promise<ItemEntity | null> {
    return await this.itemRepository.findOneBy({ id });
  }

  async findByIdOrThrow(id: Uuid): Promise<ItemEntity> {
    const item = await this.itemRepository.findOneBy({ id });

    if (!item) {
      throw new NotFoundException({
        description: `Item with ID ${id} not found.`,
      });
    }

    return item;
  }

  async findByIdWithRelationsOrThrow(id: Uuid): Promise<ItemEntity> {
    const item = await this.itemRepository.findOne({
      where: {
        id
      },
      relations: {
        owner: true,
        winner: true,
        bids: {
          user: true,
        },
      },
      order: {
        bids: {
          createdAt: 'DESC'
        }
      }
    });

    if (!item) {
      throw new NotFoundException({
        description: `Item with ID ${id} not found.`,
      });
    }

    return item;
  }

  async findByOwnerId(ownerId: Uuid): Promise<ItemEntity[]> {
    return await this.itemRepository.find({
      where: { ownerId },
      relations: {
        bids: true,
      },
    });
  }

  async update(itemEntity: ItemEntity): Promise<void> {
    await this.itemRepository.save(itemEntity);
  }

  async findNonBiddedItems(
    name: string | undefined,
    startingPriceFrom: number | undefined,
    startingPriceTo: number | undefined,
  ): Promise<ItemEntity[]> {
    return await this.itemRepository.findBy({
      name: name ? Like(`%${name}%`) : undefined,
      startingPrice:
        startingPriceFrom && startingPriceTo
          ? MoreThanOrEqual(startingPriceFrom) &&
          LessThanOrEqual(startingPriceTo)
          : startingPriceFrom
            ? MoreThanOrEqual(startingPriceFrom)
            : startingPriceTo
              ? LessThanOrEqual(startingPriceTo)
              : undefined,
      winnerId: IsNull(),
      finalPrice: IsNull(),
    });
  }

  async findItemsByFilter(
    name: string | undefined,
    ownerName: string | undefined,
    startTime: Date | undefined,
    endTime: Date | undefined,
    startingPriceFrom: number | undefined,
    startingPriceTo: number | undefined,
  ): Promise<ItemEntity[]> {
    return await this.itemRepository.find({
      where: {
        name: name ? Like(`%${name}%`) : undefined,
        owner: ownerName
          ? [
            { firstName: Like(`%${ownerName}%`) },
            { lastName: Like(`%${ownerName}%`) },
          ]
          : undefined,
        startTime: startTime ? MoreThanOrEqual(startTime) : undefined,
        endTime: endTime ? LessThanOrEqual(endTime) : undefined,
        startingPrice:
          startingPriceFrom && startingPriceTo
            ? MoreThanOrEqual(startingPriceFrom) &&
            LessThanOrEqual(startingPriceTo)
            : startingPriceFrom
              ? MoreThanOrEqual(startingPriceFrom)
              : startingPriceTo
                ? LessThanOrEqual(startingPriceTo)
                : undefined,
      },
      relations: {
        owner: true,
        winner: true,
      },
    });
  }

  async findItemsNotNotified(endTime: Date): Promise<ItemEntity[]> {
    return await this.itemRepository.findBy({
      endTime: LessThanOrEqual(endTime),
      winnerId: Not(IsNull()),
      isWinnerNotified: false,
    });
  }

  async findWinningBidsByUserId(userId: Uuid): Promise<ItemEntity[]> {
    return await this.itemRepository.find({
      where: {
        winnerId: userId,
        endTime: LessThan(new Date()),
      },
      relations: {
        owner: true,
        winner: true,
      },
    });
  }

  async getRevenueByOwnerId(
    ownerId: Uuid,
    startDate: Date,
    endDate: Date,
  ): Promise<number | null> {
    const revenue: number | null = await this.dataSource
      .getRepository(ItemEntity)
      .createQueryBuilder("item")
      .select("SUM(item.finalPrice)", "revenue")
      .where("item.ownerId = :ownerId", { ownerId })
      .andWhere("item.endTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("item.finalPrice IS NOT NULL")
      .getRawOne<{ revenue: string | null }>()
      .then(
        (
          result:
            | {
              revenue: string | null;
            }
            | undefined,
        ) => {
          if (result && result.revenue !== null) {
            return parseFloat(result.revenue);
          }
          return null;
        },
      );

    return revenue;
  }

  async getStatisticByUserId(
    userId: Uuid,
    startDate: Date,
    endDate: Date,
  ): Promise<GetStatisticByUserIdDto> {
    const monthlyRevenueRaw = this.itemRepository
      .createQueryBuilder("item")
      .where("item.ownerId = :userId", { userId })
      .andWhere("item.endTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("item.finalPrice IS NOT NULL")
      .select("TO_CHAR(item.endTime, 'YYYY-MM')", "month")
      .addSelect("SUM(item.finalPrice)", "revenue")
      .addSelect("COUNT(item.id)", "itemSold")
      .groupBy("TO_CHAR(item.endTime, 'YYYY-MM')");

    const revenueRaw = this.itemRepository
      .createQueryBuilder("item")
      .where("item.ownerId = :userId", { userId })
      .andWhere("item.endTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("item.finalPrice IS NOT NULL")
      .select("SUM(item.finalPrice)", "totalRevenue")
      .addSelect("COUNT(item.id)", "totalItemsSold");

    const monthlySpendingRaw = this.itemRepository
      .createQueryBuilder("item")
      .where("item.winnerId = :userId", { userId })
      .andWhere("item.endTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("item.finalPrice IS NOT NULL")
      .select("TO_CHAR(item.endTime, 'YYYY-MM')", "month")
      .addSelect("SUM(item.finalPrice)", "spending")
      .addSelect("COUNT(item.id)", "itemsWon")
      .groupBy("TO_CHAR(item.endTime, 'YYYY-MM')");

    const spendingRaw = this.itemRepository
      .createQueryBuilder("item")
      .where("item.winnerId = :userId", { userId })
      .andWhere("item.endTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("item.finalPrice IS NOT NULL")
      .select("SUM(item.finalPrice)", "totalSpending")
      .addSelect("COUNT(item.id)", "totalItemsWon");

    const monthlyBidsRaw = this.itemRepository
      .createQueryBuilder("item")
      .leftJoin("item.bids", "bid")
      .where("bid.userId = :userId", { userId })
      .andWhere("item.endTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .select("TO_CHAR(item.endTime, 'YYYY-MM')", "month")
      .addSelect("COUNT(bid.id)", "bidsPlaced")
      .groupBy("TO_CHAR(item.endTime, 'YYYY-MM')");

    const bidsRaw = this.itemRepository
      .createQueryBuilder("item")
      .leftJoin("item.bids", "bid")
      .where("bid.userId = :userId", { userId })
      .andWhere("item.endTime BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .select("COUNT(bid.id)", "totalBidsPlaced");

    const [
      monthlyRevenue,
      monthlySpending,
      monthlyBids,
      revenueResult,
      spendingResult,
      bidsResult,
    ] = await Promise.all([
      monthlyRevenueRaw.getRawMany(),
      monthlySpendingRaw.getRawMany(),
      monthlyBidsRaw.getRawMany(),
      revenueRaw.getRawOne(),
      spendingRaw.getRawOne(),
      bidsRaw.getRawOne(),
    ]);

    // Generate all months in the date range
    const monthlyMap = new Map<string, any>();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endMonth) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(monthKey, {
        month: monthKey,
        revenue: 0,
        itemSold: 0,
        spending: 0,
        itemsWon: 0,
        bidsPlaced: 0,
      });
      current.setMonth(current.getMonth() + 1);
    }

    // Merge monthly data
    monthlyRevenue.forEach((item: any) => {
      const existing = monthlyMap.get(item.month);
      if (existing) {
        existing.revenue = parseFloat(item.revenue) || 0;
        existing.itemSold = parseInt(item.itemSold) || 0;
      }
    });

    monthlySpending.forEach((item: any) => {
      const existing = monthlyMap.get(item.month);
      if (existing) {
        existing.spending = parseFloat(item.spending) || 0;
        existing.itemsWon = parseInt(item.itemsWon) || 0;
      }
    });

    monthlyBids.forEach((item: any) => {
      const existing = monthlyMap.get(item.month);
      if (existing) {
        existing.bidsPlaced = parseInt(item.bidsPlaced) || 0;
      }
    });

    const monthlySalesReports = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    return {
      monthlySalesReports,
      totalRevenue: parseFloat(revenueResult?.totalRevenue) || 0,
      totalItemsSold: parseInt(revenueResult?.totalItemsSold) || 0,
      totalSpending: parseFloat(spendingResult?.totalSpending) || 0,
      totalItemsWon: parseInt(spendingResult?.totalItemsWon) || 0,
      totalBidsPlaced: parseInt(bidsResult?.totalBidsPlaced) || 0,
    };
  }
}
