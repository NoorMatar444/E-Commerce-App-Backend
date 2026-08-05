import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    // 1. Pass <string> to getType() so TypeScript doesn't panic if 'graphql' or custom protocols are evaluated
    const contextType = ctx.getType<string>();

    let user: Record<string, unknown> | undefined = undefined;

    switch (contextType) {
      case 'http': {
        // Safe: Express/Fastify request object
        const request = ctx
          .switchToHttp()
          .getRequest<{ user?: Record<string, unknown> }>();
        user = request.user;
        break;
      }

      default:
        break;
    }

    if (!user) {
      return null;
    }

    // Return specific property if requested (e.g., @CurrentUser('email')), otherwise return full object
    return data ? user[data] : user;
  },
);
