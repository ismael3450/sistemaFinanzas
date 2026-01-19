import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrganizationService } from './organization.service';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportQuery {
  startDate?: Date;
  endDate?: Date;
  format?: ExportFormat;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly API_URL = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/exports`;
  }

  exportTransactions(query: ExportQuery = {}): void {
    let params = new HttpParams();
    if (query.startDate) params = params.set('startDate', query.startDate.toISOString());
    if (query.endDate) params = params.set('endDate', query.endDate.toISOString());
    if (query.format) params = params.set('format', query.format);

    this.http.get(`${this.getUrl()}/transactions`, { 
      params, 
      responseType: 'blob',
      observe: 'response'
    }).subscribe(response => {
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `transacciones.${query.format || 'csv'}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      this.downloadFile(response.body as Blob, filename);
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
