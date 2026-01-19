import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    MessageModule
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-4">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i class="pi pi-wallet text-3xl text-primary-600"></i>
          </div>
          <h1 class="text-2xl font-bold text-white">FinControl</h1>
          <p class="text-primary-100">Sistema de Control Financiero</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h2 class="text-xl font-semibold text-gray-800 mb-6">Iniciar Sesión</h2>

          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-4"></p-message>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="email">Correo electrónico</label>
              <input 
                pInputText 
                id="email" 
                type="email" 
                formControlName="email"
                placeholder="tu@correo.com"
                class="w-full"
                [class.ng-invalid]="form.get('email')?.invalid && form.get('email')?.touched">
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <small class="error-message">El correo es requerido</small>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <small class="error-message">Ingrese un correo válido</small>
              }
            </div>

            <div class="form-group">
              <label for="password">Contraseña</label>
              <p-password 
                id="password" 
                formControlName="password"
                placeholder="••••••••"
                [toggleMask]="true"
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full">
              </p-password>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <small class="error-message">La contraseña es requerida</small>
              }
            </div>

            <div class="flex items-center justify-between mb-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <p-checkbox formControlName="remember" [binary]="true"></p-checkbox>
                <span class="text-sm text-gray-600">Recordarme</span>
              </label>
              <a routerLink="/auth/forgot-password" class="text-sm text-primary-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <p-button 
              type="submit"
              label="Iniciar Sesión"
              styleClass="w-full"
              [loading]="isLoading()"
              [disabled]="form.invalid || isLoading()">
            </p-button>
          </form>

          <div class="mt-6 text-center">
            <p class="text-gray-600">
              ¿No tienes cuenta? 
              <a routerLink="/auth/register" class="text-primary-600 font-medium hover:underline">
                Regístrate
              </a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <p class="text-center text-primary-100 mt-6 text-sm">
          © 2024 FinControl. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  form: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      remember: [false]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Credenciales inválidas');
      }
    });
  }
}
