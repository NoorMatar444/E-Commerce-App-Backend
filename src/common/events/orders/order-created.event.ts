import { Types } from 'mongoose';

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: Types.ObjectId,
    public readonly userId: Types.ObjectId,
  ) {}
}
