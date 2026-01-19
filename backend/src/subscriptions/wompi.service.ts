import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface WompiTransactionRequest {
  acceptance_token: string;
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  reference: string;
  payment_method: {
    type: string;
    token: string;
    installments: number;
  };
}

export interface WompiTransactionResponse {
  data: {
    id: string;
    created_at: string;
    amount_in_cents: number;
    reference: string;
    currency: string;
    payment_method_type: string;
    status: string;
    status_message: string;
  };
}

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);
  private readonly apiUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly eventsSecret: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get('WOMPI_API_URL') || 'https://api.wompi.sv/v1';
    this.publicKey = this.configService.get('WOMPI_PUBLIC_KEY') || '';
    this.privateKey = this.configService.get('WOMPI_PRIVATE_KEY') || '';
    this.eventsSecret = this.configService.get('WOMPI_EVENTS_SECRET') || '';
  }

  async getAcceptanceToken(): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/merchants/${this.publicKey}`);
      const data = await response.json();
      return data.data.presigned_acceptance.acceptance_token;
    } catch (error) {
      this.logger.error('Failed to get acceptance token:', error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async createTransaction(
    amountInCents: number,
    currency: string,
    customerEmail: string,
    reference: string,
    paymentToken: string,
  ): Promise<WompiTransactionResponse> {
    try {
      const acceptanceToken = await this.getAcceptanceToken();

      const body: WompiTransactionRequest = {
        acceptance_token: acceptanceToken,
        amount_in_cents: amountInCents,
        currency,
        customer_email: customerEmail,
        reference,
        payment_method: {
          type: 'CARD',
          token: paymentToken,
          installments: 1,
        },
      };

      const response = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.privateKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error('Wompi transaction failed:', error);
        throw new BadRequestException(error.error?.message || 'Payment failed');
      }

      return response.json();
    } catch (error) {
      this.logger.error('Failed to create transaction:', error);
      throw new BadRequestException('Payment processing failed');
    }
  }

  async getTransaction(transactionId: string): Promise<WompiTransactionResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/transactions/${transactionId}`, {
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
        },
      });

      if (!response.ok) {
        throw new BadRequestException('Failed to get transaction');
      }

      return response.json();
    } catch (error) {
      this.logger.error('Failed to get transaction:', error);
      throw new BadRequestException('Failed to get transaction status');
    }
  }

  verifyWebhookSignature(
    payload: any,
    receivedChecksum: string,
    properties: string[],
  ): boolean {
    try {
      // Build string from properties in order
      const values = properties.map(prop => {
        const keys = prop.split('.');
        let value = payload;
        for (const key of keys) {
          value = value?.[key];
        }
        return value;
      });

      const concatenated = values.join('') + this.eventsSecret;
      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(concatenated)
        .digest('hex');

      return calculatedChecksum === receivedChecksum;
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}
