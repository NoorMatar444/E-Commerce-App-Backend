import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server } from 'socket.io';
import { TokenServices } from 'src/common/Services/Token.services';
import { SocketAuthType } from 'src/common/interface/socket.interface';

// WebSocket server for real-time notification delivery.
// Clients connect to: http://localhost:3000/notifications
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  // NestJS injects the Socket.IO server instance — used to broadcast to rooms
  @WebSocketServer()
  server!: Server;

  constructor(private readonly tokenServices: TokenServices) {}

  // Called once when a client connects — authenticate before allowing the connection
  async handleConnection(client: SocketAuthType) {
    try {
      // Token is sent once at connect time (not on every message like HTTP)
      const token = this.extractToken(client);

      if (!token) {
        throw new UnauthorizedException('Token missing');
      }

      // Same JWT validation as REST AuthGuard
      const { user, verifiedToken } =
        await this.tokenServices.checkToken(token);

      // Attach user to socket — available as client.data.user for this connection
      client.data = {
        user,
        verifiedToken,
      };

      const userId = user._id.toString();
      // Join a room so we can target this user across all their devices (phone, laptop, etc.)
      await client.join(this.getUserRoom(userId));

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch {
      this.logger.warn(`Connection rejected: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: SocketAuthType) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Socket.IO automatically removes the client from all rooms
  }

  // Called by NotificationRealtimeListener — push notification to a specific user
  sendToUser(userId: string, payload: unknown) {
    // Emit 'notification' event to all sockets in room user:{userId}
    this.server.to(this.getUserRoom(userId)).emit('notification', payload);
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private extractToken(client: SocketAuthType): string | undefined {
    // Preferred: client connects with io(url, { auth: { token: 'JWT' } })
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    // Fallback: Authorization header at connect time
    const authorization = client.handshake.headers.authorization;

    if (typeof authorization !== 'string') {
      return undefined;
    }

    return authorization.startsWith('Bearer ')
      ? authorization.split(' ')[1]
      : authorization;
  }
}
