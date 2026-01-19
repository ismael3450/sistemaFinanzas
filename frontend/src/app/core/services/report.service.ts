import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  PeriodSummary, 
  CategoryReport, 
  AccountReportItem, 
  TrendsReport,
  ReportQuery,
  ApiResponse 
} from '../models';
import { OrganizationService } from './organization.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly API_URL = environment.apiUrl;

  private _summary = signal<PeriodSummary | null>(null);
  private _categoryReport = signal<CategoryReport | null>(null);
  private _accountReport = signal<AccountReportItem[]>([]);
  private _trendsReport = signal<TrendsReport | null>(null);
  private _isLoading = signal<boolean>(false);

  readonly summary = this._summary.asReadonly();
  readonly categoryReport = this._categoryReport.asReadonly();
  readonly accountReport = this._accountReport.asReadonly();
  readonly trendsReport = this._trendsReport.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/reports`;
  }

  private buildParams(query: ReportQuery): HttpParams {
    let params = new HttpParams();
    if (query.startDate) params = params.set('startDate', query.startDate.toISOString());
    if (query.endDate) params = params.set('endDate', query.endDate.toISOString());
    return params;
  }

  getSummary(query: ReportQuery = {}): Observable<ApiResponse<PeriodSummary>> {
    this._isLoading.set(true);
    return this.http.get<ApiResponse<PeriodSummary>>(
      `${this.getUrl()}/summary`, 
      { params: this.buildParams(query) }
    ).pipe(
      tap(response => {
        this._summary.set(response.data);
        this._isLoading.set(false);
      })
    );
  }

  getCategoryReport(query: ReportQuery = {}): Observable<ApiResponse<CategoryReport>> {
    this._isLoading.set(true);
    return this.http.get<ApiResponse<CategoryReport>>(
      `${this.getUrl()}/by-category`, 
      { params: this.buildParams(query) }
    ).pipe(
      tap(response => {
        this._categoryReport.set(response.data);
        this._isLoading.set(false);
      })
    );
  }

  getAccountReport(query: ReportQuery = {}): Observable<ApiResponse<AccountReportItem[]>> {
    this._isLoading.set(true);
    return this.http.get<ApiResponse<AccountReportItem[]>>(
      `${this.getUrl()}/by-account`, 
      { params: this.buildParams(query) }
    ).pipe(
      tap(response => {
        this._accountReport.set(response.data);
        this._isLoading.set(false);
      })
    );
  }

  getTrendsReport(query: ReportQuery = {}): Observable<ApiResponse<TrendsReport>> {
    this._isLoading.set(true);
    return this.http.get<ApiResponse<TrendsReport>>(
      `${this.getUrl()}/trends`, 
      { params: this.buildParams(query) }
    ).pipe(
      tap(response => {
        this._trendsReport.set(response.data);
        this._isLoading.set(false);
      })
    );
  }

  clearState(): void {
    this._summary.set(null);
    this._categoryReport.set(null);
    this._accountReport.set([]);
    this._trendsReport.set(null);
  }
}
