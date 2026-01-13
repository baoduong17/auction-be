import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
  Inject,
} from "@nestjs/common";
import { Response } from "express";
import { CreateItemRequestDto } from "./dto/request/create-item.request.dto";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ItemsMapper } from "./mapper/items.mapper";
import { GetItemByIdResponseDto } from "./dto/response/get-item-by-id.response.dto";
import { Uuid } from "common/types";
import { GetItemByIdQuery } from "./cqrs/queries/implements/get-item-by-id.query";
import { GetItemsByOwnerIdQuery } from "./cqrs/queries/implements/get-items-by-owner-id.query";
import { UpdateItemRequestDto } from "./dto/request/update-item.request.dto";
import { GetNonBiddedItemsResponseDto } from "./dto/response/get-non-bidded-items.response.dto";
import { GetNonBiddedItemsQuery } from "./cqrs/queries/implements/get-non-bidded-items.query";
import { GetWinningBidsByUserIdResponseDto } from "./dto/response/get-winning-bids-by-user-id.response.dto";
import { GetWinningBidsByUserIdQuery } from "./cqrs/queries/implements/get-winning-bids-by-user-id.query";
import { GetRevenueByOwnerIdResponseDto } from "./dto/response/get-revenue-by-owner-id.response.dto";
import { GetRevenueByOwnerIdQuery } from "./cqrs/queries/implements/get-revenue-by-owner-id.query";
import { RequireLoggedIn } from "guards/role-container";
import { AuthUser } from "decorator/auth-user.decorator";
import { UserEntity } from "modules/user/entities/user.entity";
import { GetWinningBidsByUserIdExportPdfQuery } from "./cqrs/queries/implements/get-winning-bids-by-user-id-export-pdf.query";
import { GetItemByIdExportPdfQuery } from "./cqrs/queries/implements/get-item-by-id-export-pdf.query";
import { LockItemCommand } from "./cqrs/commands/implements/lock-item.command";
import { GetItemsByFilterQuery } from "./cqrs/queries/implements/get-items-by-filter.query";
import { GetItemsByFilterResponseDto } from "./dto/response/get-items-by-filter.response.dto";
import { GetStatisticByUserIdResponseDto } from "./dto/response/get-statistic-by-user-id.response.dto";
import { GetStatisticByUserIdQuery } from "./cqrs/queries/implements/get-statistic-by-user-id.query";
import { ClientProxy } from "@nestjs/microservices/client/client-proxy";
import { NOTIFICATION_SERVICE_DI_TOKEN } from "modules/notification-service/notification-service.token";
import { NotificationCreateDto } from "modules/notification-service/dto/notification-create.dto";

@Controller("items")
@ApiTags("items")
export class ItemsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(NOTIFICATION_SERVICE_DI_TOKEN.NAME)
    private readonly client: ClientProxy,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new item" })
  @ApiResponse({
    status: 201,
    description: "The item has been successfully created.",
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiBearerAuth()
  @RequireLoggedIn()
  create(
    @AuthUser() user: UserEntity,
    @Body() createItemRequestDto: CreateItemRequestDto,
  ) {
    this.client.emit(
      NOTIFICATION_SERVICE_DI_TOKEN.CREATE_NOTI,
      new NotificationCreateDto(user.id, "USER_REGISTERED", {}),
    );

    return this.commandBus.execute(
      ItemsMapper.fromCreateItemRequestDto(createItemRequestDto, user.id),
    );
  }

  @Get("non-bidded")
  @ApiOperation({ summary: "Get non-bidded items" })
  @ApiResponse({
    status: 200,
    description: "The non-bidded items have been successfully retrieved.",
    type: [GetNonBiddedItemsResponseDto],
  })
  @ApiQuery({ name: "name", required: false, type: String })
  @ApiQuery({ name: "startingPriceFrom", required: false, type: Number })
  @ApiQuery({ name: "startingPriceTo", required: false, type: Number })
  getNonBiddedItems(
    @Query("name") name?: string,
    @Query("startingPriceFrom") startingPriceFrom?: number,
    @Query("startingPriceTo") startingPriceTo?: number,
  ) {
    return this.queryBus.execute(
      new GetNonBiddedItemsQuery(name, startingPriceFrom, startingPriceTo),
    );
  }

  @Get("/pdf/:id")
  @ApiOperation({ summary: "Export item by ID to PDF" })
  @ApiResponse({
    status: 200,
    description: "The item PDF has been successfully generated and sent.",
    content: {
      "application/pdf": { schema: { type: "string", format: "binary" } },
    },
  })
  async getItemByIdExportPdf(
    @Param("id", ParseUUIDPipe) id: Uuid,
    @Res() res: Response,
  ) {
    const pdfBuffer: Buffer = await this.queryBus.execute(
      new GetItemByIdExportPdfQuery(id),
    );
    const filename = `item-${id}.pdf`;

    this.sendPdfResponse(res, pdfBuffer, filename);
  }

  @Get(":userId/winning-bids/pdf")
  @ApiOperation({ summary: "Export winning bids by user ID to PDF" })
  @ApiResponse({
    status: 200,
    description:
      "The winning bids PDF has been successfully generated and sent.",
    content: {
      "application/pdf": { schema: { type: "string", format: "binary" } },
    },
  })
  async getWinningBidsByUserIdExportPdf(
    @Param("userId", ParseUUIDPipe) userId: Uuid,
    @Res() res: Response,
  ) {
    const pdfBuffer: Buffer = await this.queryBus.execute(
      new GetWinningBidsByUserIdExportPdfQuery(userId),
    );
    const filename = `winning-bids-${userId}.pdf`;

    this.sendPdfResponse(res, pdfBuffer, filename);
  }

  @Get(":userId/winning-bids")
  @ApiOperation({ summary: "Get winning bids by user ID" })
  @ApiResponse({
    status: 200,
    description: "The winning bids have been successfully retrieved.",
    type: [GetWinningBidsByUserIdResponseDto],
  })
  getWinningBidsByUserId(@Param("userId", ParseUUIDPipe) userId: Uuid) {
    return this.queryBus.execute(new GetWinningBidsByUserIdQuery(userId));
  }

  @Get("me/statistics")
  @ApiOperation({ summary: "Get statistics for the logged-in user's items" })
  @ApiResponse({
    status: 200,
    description: "The statistics have been successfully retrieved.",
    type: GetStatisticByUserIdResponseDto,
  })
  @ApiQuery({
    name: "startDate",
    required: true,
    description: "Start date in ISO format (e.g., 2023-01-01)",
  })
  @ApiQuery({
    name: "endDate",
    required: true,
    description: "End date in ISO format (e.g., 2023-12-31)",
  })
  @RequireLoggedIn()
  @ApiBearerAuth()
  async getStatisticsForLoggedInUser(
    @AuthUser() user: UserEntity,
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate: Date,
  ) {
    return this.queryBus.execute(
      new GetStatisticByUserIdQuery(user.id, startDate, endDate),
    );
  }

  @Get("filters")
  @ApiOperation({ summary: "Get items by various filters" })
  @ApiResponse({
    status: 200,
    description: "The items have been successfully retrieved by filters.",
    type: [GetItemsByFilterResponseDto],
  })
  @ApiQuery({
    name: "name",
    required: false,
    type: String,
  })
  @ApiQuery({
    name: "ownerName",
    required: false,
    type: String,
  })
  @ApiQuery({
    name: "startTime",
    required: false,
    type: String,
    description: "Start time in ISO format (e.g., 2023-01-01T00:00:00Z)",
  })
  @ApiQuery({
    name: "endTime",
    required: false,
    type: String,
    description: "End time in ISO format (e.g., 2023-12-31T23:59:59Z)",
  })
  @ApiQuery({
    name: "startingPriceFrom",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "startingPriceTo",
    required: false,
    type: Number,
  })
  getItemsByFilters(
    @Query("name") name: string,
    @Query("ownerName") ownerName: string,
    @Query("startTime") startTime: Date,
    @Query("endTime") endTime: Date,
    @Query("startingPriceFrom") startingPriceFrom: number,
    @Query("startingPriceTo") startingPriceTo: number,
  ) {
    return this.queryBus.execute(
      new GetItemsByFilterQuery(
        name,
        ownerName,
        startTime,
        endTime,
        startingPriceFrom,
        startingPriceTo,
      ),
    );
  }

  @Get(":userId/revenue")
  @ApiOperation({
    summary: "Get total revenue by owner ID within a date range",
  })
  @ApiResponse({
    status: 200,
    description: "The total revenue has been successfully retrieved.",
    type: GetRevenueByOwnerIdResponseDto,
  })
  @ApiQuery({
    name: "startDate",
    required: true,
    type: String,
    description: "Start date in ISO format (e.g., 2023-01-01)",
  })
  @ApiQuery({
    name: "endDate",
    required: true,
    type: String,
    description: "End date in ISO format (e.g., 2023-12-31)",
  })
  getRevenueByOwnerId(
    @Param("userId", ParseUUIDPipe) userId: Uuid,
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate: Date,
  ) {
    return this.queryBus.execute(
      new GetRevenueByOwnerIdQuery(userId, startDate, endDate),
    );
  }

  @Get(":ownerId/owner")
  @ApiOperation({ summary: "Get items by owner ID" })
  @ApiResponse({
    status: 200,
    description: "The items have been successfully retrieved.",
    type: [GetItemByIdResponseDto],
  })
  getItemsByOwnerId(@Param("ownerId", ParseUUIDPipe) ownerId: Uuid) {
    return this.queryBus.execute(new GetItemsByOwnerIdQuery(ownerId));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get item by ID" })
  @ApiResponse({
    status: 200,
    description: "The item has been successfully retrieved.",
    type: GetItemByIdResponseDto,
  })
  @ApiResponse({ status: 404, description: "Item not found." })
  getItemById(@Param("id", ParseUUIDPipe) id: Uuid) {
    return this.queryBus.execute(new GetItemByIdQuery(id));
  }

  @Put(":id/lock")
  @ApiOperation({ summary: "Lock an item" })
  @ApiResponse({
    status: 200,
    description: "The item has been successfully locked.",
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @RequireLoggedIn()
  @ApiBearerAuth()
  lock(@Param("id", ParseUUIDPipe) id: Uuid, @AuthUser() user: UserEntity) {
    return this.commandBus.execute(new LockItemCommand(id, user.id));
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an item" })
  @ApiResponse({
    status: 200,
    description: "The item has been successfully updated.",
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @RequireLoggedIn()
  @ApiBearerAuth()
  update(
    @Param("id", ParseUUIDPipe) id: Uuid,
    @AuthUser() user: UserEntity,
    @Body() updateItemRequestDto: UpdateItemRequestDto,
  ) {
    return this.commandBus.execute(
      ItemsMapper.fromUpdateItemRequestDto(id, updateItemRequestDto, user.id),
    );
  }

  private sendPdfResponse(res: Response, pdfBuffer: Buffer, filename: string) {
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }
}
