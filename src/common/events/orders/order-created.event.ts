import { Types } from 'mongoose';

// Payload sent with the 'order.created' event.
// OrderService emits this — listeners decide what to do with it.
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: Types.ObjectId,
    public readonly userId: Types.ObjectId,
  ) {}
}
