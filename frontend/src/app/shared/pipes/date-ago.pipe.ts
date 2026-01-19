import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateAgo',
  standalone: true
})
export class DateAgoPipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) {
      return 'hace un momento';
    } else if (diffMin < 60) {
      return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHour < 24) {
      return `hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
    } else if (diffDay < 7) {
      return `hace ${diffDay} ${diffDay === 1 ? 'día' : 'días'}`;
    } else if (diffWeek < 4) {
      return `hace ${diffWeek} ${diffWeek === 1 ? 'semana' : 'semanas'}`;
    } else if (diffMonth < 12) {
      return `hace ${diffMonth} ${diffMonth === 1 ? 'mes' : 'meses'}`;
    } else {
      return `hace ${diffYear} ${diffYear === 1 ? 'año' : 'años'}`;
    }
  }
}
