import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    // Fail at boot so a missing key is obvious, instead of sending empty auth to Stripe
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(secretKey);
    this.webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
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

    // Checkout Session is created on the server so the secret key never leaves the backend
    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email,
      metadata,
      ...(discounts?.length ? { discounts } : {}),
      // Stripe replaces {CHECKOUT_SESSION_ID} after a successful payment
      success_url: `${frontendUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/order/cancel`,
    });
  }

  // Signature check needs the raw request bytes, not the parsed JSON body
  constructEvent(rawBody: Buffer, signature: string) {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
