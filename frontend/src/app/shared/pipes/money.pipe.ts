import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'money',
  standalone: true
})
export class MoneyPipe implements PipeTransform {
  transform(
    value: string | number | null | undefined, 
    currency: string = 'USD',
    locale: string = 'en-US'
  ): string {
    if (value === null || value === undefined) {
      return '$0.00';
    }

    // Convertir de minor units a major units
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const majorValue = numValue / 100;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(majorValue);
  }
}
