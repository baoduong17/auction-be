import { Uuid } from "common/types";

export class NotificationCreateDto {
  constructor(
    public readonly userId: Uuid,
    public readonly eventCode: string,
    public readonly params: Record<string, any>,
  ) {}
}
