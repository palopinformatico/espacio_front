import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  loading = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    // Marcar todos los campos como tocados para mostrar errores
    this.loginForm.markAllAsTouched();

    // Validar campos vacíos con mensajes específicos
    if (this.loginForm.invalid) {
      const username = this.loginForm.get('username');
      const password = this.loginForm.get('password');

      let errorMessage = 'Por favor complete los siguientes campos:\n';
      const errors: string[] = [];

      if (username?.invalid) {
        errors.push('• Nombre de usuario');
      }

      if (password?.invalid) {
        errors.push('• Contraseña');
      }

      if (errors.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          html: `<div style="text-align: left;">${errorMessage}${errors.join('<br>')}</div>`,
          confirmButtonText: 'Entendido',
          background: '#ffffff',
          color: '#000000'
        });
      }
      return;
    }

    this.loading = true;
    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe(
      (res: any) => {
        // Guardamos token y rol
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('role', res.role);

        this.loading = false;

        // Redirección directa según rol (sin mostrar en pantalla ni consola)
        if (res.role === 'admin') {
          this.router.navigate(['admin']);
        } else if (res.role === 'garzon') {
          this.router.navigate(['garzon']);
        } else {
          // Solo mostramos error si el rol no es válido para redirigir
          Swal.fire({
            icon: 'error',
            title: 'Acceso denegado',
            text: 'El rol asignado no tiene permisos de acceso.',
            background: '#ffffff',
            color: '#000000'
          });
        }
      },
      (err: any) => {
        console.error('Error de login:', err);
        this.loading = false;

        // Analizar el error para mostrar mensaje específico
        let errorTitle = 'Credenciales incorrectas';
        let errorMessage = '';

        if (err.status === 401) {
          // Error de autenticación
          if (err.error?.message) {
            const mensaje = err.error.message.toLowerCase();

            if (mensaje.includes('username') || mensaje.includes('usuario') || mensaje.includes('user not found')) {
              errorTitle = 'Usuario no encontrado';
              errorMessage = '❌ El nombre de usuario ingresado no existe en el sistema.';
            } else if (mensaje.includes('password') || mensaje.includes('contraseña') || mensaje.includes('invalid credentials')) {
              errorTitle = 'Contraseña incorrecta';
              errorMessage = '❌ La contraseña ingresada es incorrecta.';
            } else {
              errorMessage = '❌ El nombre de usuario o la contraseña son incorrectos.';
            }
          } else {
            errorMessage = '❌ El nombre de usuario o la contraseña son incorrectos.';
          }
        } else if (err.status === 0) {
          errorTitle = 'Error de conexión';
          errorMessage = '⚠️ No se pudo conectar con el servidor. Verifique su conexión a internet.';
        } else if (err.status === 500) {
          errorTitle = 'Error del servidor';
          errorMessage = '⚠️ Hubo un problema en el servidor. Intente nuevamente más tarde.';
        } else {
          errorMessage = `⚠️ Error desconocido: ${err.message || 'Por favor, intente nuevamente.'}`;
        }

        Swal.fire({
          icon: 'error',
          title: errorTitle,
          html: errorMessage,
          confirmButtonText: 'Reintentar',
          background: '#ffffff',
          color: '#000000',
          customClass: {
            popup: 'swal-popup-legible',
            title: 'swal-title-legible',
            htmlContainer: 'swal-text-legible'
          }
        });
      }
    );
  }
}
