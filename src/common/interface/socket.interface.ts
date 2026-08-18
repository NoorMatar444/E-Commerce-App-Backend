import { JwtPayload } from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { IHUser } from 'src/models/user.model';

// Extends the base Socket type with typed auth data.
// After handleConnection succeeds, client.data.user is available (like req.user in HTTP).
export interface SocketAuthType extends Socket {
  handshake: Socket['handshake'] & {
    auth: {
      token?: string; // JWT sent by client on connect: io(url, { auth: { token } })
    };
  };
  data: {
    user: IHUser;
    verifiedToken: JwtPayload;
  };
}
