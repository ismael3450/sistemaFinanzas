import { Injectable } from '@nestjs/common';
import Dinero from 'dinero.js';

export interface MoneyOptions {
  amount: number;
  currency?: Dinero.Currency;
}

@Injectable()
export class MoneyService {
  /**
   * Create a Dinero instance from minor units (cents)
   */
  fromMinorUnits(
    amount: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): Dinero.Dinero {
    return Dinero({
      amount: Number(amount),
      currency,
    });
  }

  /**
   * Create a Dinero instance from major units (dollars)
   */
  fromMajorUnits(
    amount: number,
    currency: Dinero.Currency = 'USD',
  ): Dinero.Dinero {
    return Dinero({
      amount: Math.round(amount * 100),
      currency,
    });
  }

  /**
   * Convert to minor units (for database storage)
   */
  toMinorUnits(money: Dinero.Dinero): bigint {
    return BigInt(money.getAmount());
  }

  /**
   * Convert to major units (for display)
   */
  toMajorUnits(money: Dinero.Dinero): number {
    return money.toUnit();
  }

  /**
   * Format money for display
   */
  format(
    amount: number | bigint,
    currency: Dinero.Currency = 'USD',
    locale: string = 'en-US',
  ): string {
    const money = this.fromMinorUnits(amount, currency);
    return money.toFormat('$0,0.00');
  }

  /**
   * Add two money amounts
   */
  add(
    a: number | bigint,
    b: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): bigint {
    const moneyA = this.fromMinorUnits(a, currency);
    const moneyB = this.fromMinorUnits(b, currency);
    return this.toMinorUnits(moneyA.add(moneyB));
  }

  /**
   * Subtract two money amounts
   */
  subtract(
    a: number | bigint,
    b: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): bigint {
    const moneyA = this.fromMinorUnits(a, currency);
    const moneyB = this.fromMinorUnits(b, currency);
    return this.toMinorUnits(moneyA.subtract(moneyB));
  }

  /**
   * Multiply money by a factor
   */
  multiply(
    amount: number | bigint,
    factor: number,
    currency: Dinero.Currency = 'USD',
  ): bigint {
    const money = this.fromMinorUnits(amount, currency);
    return this.toMinorUnits(money.multiply(factor));
  }

  /**
   * Divide money by a divisor
   */
  divide(
    amount: number | bigint,
    divisor: number,
    currency: Dinero.Currency = 'USD',
  ): bigint {
    const money = this.fromMinorUnits(amount, currency);
    return this.toMinorUnits(money.divide(divisor));
  }

  /**
   * Calculate percentage
   */
  percentage(
    amount: number | bigint,
    percent: number,
    currency: Dinero.Currency = 'USD',
  ): bigint {
    const money = this.fromMinorUnits(amount, currency);
    return this.toMinorUnits(money.percentage(percent));
  }

  /**
   * Check if two amounts are equal
   */
  equals(
    a: number | bigint,
    b: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): boolean {
    const moneyA = this.fromMinorUnits(a, currency);
    const moneyB = this.fromMinorUnits(b, currency);
    return moneyA.equalsTo(moneyB);
  }

  /**
   * Check if a is greater than b
   */
  greaterThan(
    a: number | bigint,
    b: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): boolean {
    const moneyA = this.fromMinorUnits(a, currency);
    const moneyB = this.fromMinorUnits(b, currency);
    return moneyA.greaterThan(moneyB);
  }

  /**
   * Check if a is less than b
   */
  lessThan(
    a: number | bigint,
    b: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): boolean {
    const moneyA = this.fromMinorUnits(a, currency);
    const moneyB = this.fromMinorUnits(b, currency);
    return moneyA.lessThan(moneyB);
  }

  /**
   * Check if amount is zero
   */
  isZero(amount: number | bigint, currency: Dinero.Currency = 'USD'): boolean {
    const money = this.fromMinorUnits(amount, currency);
    return money.isZero();
  }

  /**
   * Check if amount is positive
   */
  isPositive(
    amount: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): boolean {
    const money = this.fromMinorUnits(amount, currency);
    return money.isPositive();
  }

  /**
   * Check if amount is negative
   */
  isNegative(
    amount: number | bigint,
    currency: Dinero.Currency = 'USD',
  ): boolean {
    const money = this.fromMinorUnits(amount, currency);
    return money.isNegative();
  }

  /**
   * Allocate money according to ratios
   */
  allocate(
    amount: number | bigint,
    ratios: number[],
    currency: Dinero.Currency = 'USD',
  ): bigint[] {
    const money = this.fromMinorUnits(amount, currency);
    return money.allocate(ratios).map((m) => this.toMinorUnits(m));
  }
}
