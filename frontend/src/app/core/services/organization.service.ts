import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Organization,
  OrganizationWithStats,
  CreateOrganizationRequest,
  ApiResponse,
  Member,
  Role
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly API_URL = `${environment.apiUrl}/organizations`;
  private readonly ACTIVE_ORG_KEY = 'active_organization';
  private readonly ACTIVE_MEMBERSHIP_KEY = 'active_membership';

  // Signals
  private _organizations = signal<Organization[]>([]);
  private _activeOrganization = signal<Organization | null>(null);
  private _currentMembership = signal<Member | null>(null);

  readonly organizations = this._organizations.asReadonly();
  readonly activeOrganization = this._activeOrganization.asReadonly();
  readonly currentMembership = this._currentMembership.asReadonly();

  readonly hasActiveOrg = computed(() => this._activeOrganization() !== null);

  readonly activeOrgId = computed(() => this._activeOrganization()?.id || null);

  readonly currentRole = computed(() => this._currentMembership()?.role || null);

  readonly canManageOrg = computed(() => {
    const role = this.currentRole();
    return role === 'OWNER' || role === 'ADMIN';
  });

  readonly canManageFinances = computed(() => {
    const role = this.currentRole();
    return ['OWNER', 'ADMIN', 'TREASURER'].includes(role || '');
  });

  readonly canCreateTransactions = computed(() => {
    const role = this.currentRole();
    return ['OWNER', 'ADMIN', 'TREASURER', 'MEMBER'].includes(role || '');
  });

  constructor(private http: HttpClient) {
    this.loadActiveOrganization();
    this.loadActiveMembership();
  }

  private loadActiveOrganization(): void {
    const stored = localStorage.getItem(this.ACTIVE_ORG_KEY);
    if (stored) {
      try {
        this._activeOrganization.set(JSON.parse(stored));
      } catch {
        localStorage.removeItem(this.ACTIVE_ORG_KEY);
      }
    }
  }

  private loadActiveMembership(): void {
    const stored = localStorage.getItem(this.ACTIVE_MEMBERSHIP_KEY);
    if (stored) {
      try {
        this._currentMembership.set(JSON.parse(stored));
      } catch {
        localStorage.removeItem(this.ACTIVE_MEMBERSHIP_KEY);
      }
    }
  }

  // CRUD Operations
  create(data: CreateOrganizationRequest): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(this.API_URL, data).pipe(
        tap(response => {
          this._organizations.update(orgs => [...orgs, response.data]);
          this.setActiveOrganization(response.data);
        })
    );
  }

  getAll(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(this.API_URL).pipe(
        tap(response => this._organizations.set(response.data))
    );
  }

  getById(id: string): Observable<ApiResponse<OrganizationWithStats>> {
    return this.http.get<ApiResponse<OrganizationWithStats>>(`${this.API_URL}/${id}`);
  }

  getBySlug(slug: string): Observable<ApiResponse<Organization>> {
    return this.http.get<ApiResponse<Organization>>(`${this.API_URL}/slug/${slug}`);
  }

  update(id: string, data: Partial<CreateOrganizationRequest>): Observable<ApiResponse<Organization>> {
    return this.http.patch<ApiResponse<Organization>>(`${this.API_URL}/${id}`, data).pipe(
        tap(response => {
          this._organizations.update(orgs =>
              orgs.map(o => o.id === id ? response.data : o)
          );
          if (this._activeOrganization()?.id === id) {
            this.setActiveOrganization(response.data);
          }
        })
    );
  }

  setActive(id: string): Observable<ApiResponse<{ message: string; membership: Member }>> {
    return this.http.post<ApiResponse<{ message: string; membership: Member }>>(`${this.API_URL}/${id}/set-active`, {}).pipe(
        tap((response) => {
          const org = this._organizations().find(o => o.id === id);
          if (org) {
            this.setActiveOrganization(org);
          }
          // Set the current membership with the role
          if (response.data.membership) {
            this.setCurrentMembership(response.data.membership as Member);
          }
        })
    );
  }

  activate(id: string): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(`${this.API_URL}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(`${this.API_URL}/${id}/deactivate`, {});
  }

  // Local state management
  setActiveOrganization(org: Organization): void {
    this._activeOrganization.set(org);
    localStorage.setItem(this.ACTIVE_ORG_KEY, JSON.stringify(org));
  }

  clearActiveOrganization(): void {
    this._activeOrganization.set(null);
    this._currentMembership.set(null);
    localStorage.removeItem(this.ACTIVE_ORG_KEY);
    localStorage.removeItem(this.ACTIVE_MEMBERSHIP_KEY);
  }

  setCurrentMembership(member: Member): void {
    this._currentMembership.set(member);
    localStorage.setItem(this.ACTIVE_MEMBERSHIP_KEY, JSON.stringify(member));
  }

  hasPermission(requiredRoles: Role[]): boolean {
    const currentRole = this.currentRole();
    if (!currentRole) return false;

    const roleHierarchy: Record<Role, number> = {
      OWNER: 5,
      ADMIN: 4,
      TREASURER: 3,
      MEMBER: 2,
      VIEWER: 1
    };

    const userLevel = roleHierarchy[currentRole];
    return requiredRoles.some(role => userLevel >= roleHierarchy[role]);
  }
}