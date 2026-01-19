import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
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

        <!-- Register Card -->
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h2 class="text-xl font-semibold text-gray-800 mb-6">Crear Cuenta</h2>

          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-4"></p-message>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label for="firstName">Nombre</label>
                <input 
                  pInputText 
                  id="firstName" 
                  formControlName="firstName"
                  placeholder="Juan"
                  class="w-full">
                @if (form.get('firstName')?.hasError('required') && form.get('firstName')?.touched) {
                  <small class="error-message">Requerido</small>
                }
              </div>

              <div class="form-group">
                <label for="lastName">Apellido</label>
                <input 
                  pInputText 
                  id="lastName" 
                  formControlName="lastName"
                  placeholder="Pérez"
                  class="w-full">
                @if (form.get('lastName')?.hasError('required') && form.get('lastName')?.touched) {
                  <small class="error-message">Requerido</small>
                }
              </div>
            </div>

            <div class="form-group">
              <label for="email">Correo electrónico</label>
              <input 
                pInputText 
                id="email" 
                type="email" 
                formControlName="email"
                placeholder="tu@correo.com"
                class="w-full">
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <small class="error-message">El correo es requerido</small>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <small class="error-message">Ingrese un correo válido</small>
              }
            </div>

            <div class="form-group">
              <label for="phone">Teléfono (opcional)</label>
              <input 
                pInputText 
                id="phone" 
                formControlName="phone"
                placeholder="+503 7000-0000"
                class="w-full">
            </div>

            <div class="form-group">
              <label for="password">Contraseña</label>
              <p-password 
                id="password" 
                formControlName="password"
                placeholder="Mínimo 8 caracteres"
                [toggleMask]="true"
                styleClass="w-full"
                inputStyleClass="w-full"
                promptLabel="Ingrese una contraseña"
                weakLabel="Débil"
                mediumLabel="Media"
                strongLabel="Fuerte">
              </p-password>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <small class="error-message">La contraseña es requerida</small>
              }
              @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                <small class="error-message">Mínimo 8 caracteres</small>
              }
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirmar Contraseña</label>
              <p-password 
                id="confirmPassword" 
                formControlName="confirmPassword"
                placeholder="Repite tu contraseña"
                [toggleMask]="true"
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full">
              </p-password>
              @if (form.hasError('mismatch')) {
                <small class="error-message">Las contraseñas no coinciden</small>
              }
            </div>

            <p-button 
              type="submit"
              label="Crear Cuenta"
              styleClass="w-full mt-4"
              [loading]="isLoading()"
              [disabled]="form.invalid || isLoading()">
            </p-button>
          </form>

          <div class="mt-6 text-center">
            <p class="text-gray-600">
              ¿Ya tienes cuenta? 
              <a routerLink="/auth/login" class="text-primary-600 font-medium hover:underline">
                Inicia Sesión
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  form: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup): { mismatch: boolean } | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { firstName, lastName, email, phone, password } = this.form.value;

    this.authService.register({ firstName, lastName, email, phone, password }).subscribe({
      next: () => {
        this.router.navigate(['/organizations']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al crear la cuenta');
      }
    });
  }
}
