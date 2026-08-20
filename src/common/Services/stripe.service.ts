import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private webhookSecret: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  private getClient(): Stripe {
    if (!this.stripe) {
      const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }

      this.stripe = new Stripe(secretKey);
    }

    return this.stripe;
  }

  async createCheckoutSession({
    line_items,
    customer_email,
    metadata,
    discounts,
  }: {
    line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
    customer_email: string;
    metadata?: Stripe.MetadataParam;
    discounts?: Stripe.Checkout.SessionCreateParams.Discount[];
  }) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    return this.getClient().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email,
      metadata,
      ...(discounts?.length ? { discounts } : {}),
      success_url: `${frontendUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/order/cancel`,
    });
  }

  constructEvent(rawBody: Buffer, signature: string) {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.getClient().webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
