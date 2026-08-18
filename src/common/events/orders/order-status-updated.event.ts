import { Types } from 'mongoose';
import { OrderStatus } from 'src/common/enums/order.enum';

// Payload sent with the 'order.status.updated' event.
// Used for both admin status changes and user cancellations.
export class OrderStatusUpdatedEvent {
  constructor(
    public readonly orderId: Types.ObjectId,
    public readonly userId: Types.ObjectId,
    public readonly status: OrderStatus,
  ) {}
}
