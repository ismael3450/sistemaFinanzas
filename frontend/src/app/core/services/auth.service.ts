import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  // Signals para estado reactivo
  private _currentUser = signal<User | null>(null);
  private _isAuthenticated = signal<boolean>(false);
  private _isLoading = signal<boolean>(true);

  // Computed signals públicos
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly userFullName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  readonly userInitials = computed(() => {
    const user = this._currentUser();
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getToken();
    const storedUser = localStorage.getItem(this.USER_KEY);

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this._currentUser.set(user);
        this._isAuthenticated.set(true);
        // Verificar token con el servidor
        this.getCurrentUser().subscribe({
          error: () => this.logout()
        });
      } catch {
        this.clearStorage();
      }
    }
    this._isLoading.set(false);
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/register`, data).pipe(
      tap(response => this.handleAuthResponse(response.data))
    );
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, data).pipe(
      tap(response => this.handleAuthResponse(response.data))
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    
    if (this.getToken()) {
      this.http.post(`${this.API_URL}/logout`, { refreshToken }).subscribe();
    }

    this.clearStorage();
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>>(
      `${this.API_URL}/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => {
        this.setToken(response.data.accessToken);
        this.setRefreshToken(response.data.refreshToken);
      })
    );
  }

  getCurrentUser(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/me`).pipe(
      tap(response => {
        this._currentUser.set(response.data);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
      })
    );
  }

  updateProfile(data: Pick<User, 'firstName' | 'lastName'>): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.API_URL}/me`, data).pipe(
        tap(response => {
          this._currentUser.set(response.data);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
        })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.API_URL}/change-password`, {
      currentPassword,
      newPassword
    });
  }

  private handleAuthResponse(auth: AuthResponse): void {
    this.setToken(auth.tokens.accessToken);
    this.setRefreshToken(auth.tokens.refreshToken);
    this._currentUser.set(auth.user);
    this._isAuthenticated.set(true);
    localStorage.setItem(this.USER_KEY, JSON.stringify(auth.user));
    this.getCurrentUser().subscribe({ error: () => null });
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  hasRole(roles: string[]): boolean {
    // Implementar según la lógica de roles
    return true;
  }
}
