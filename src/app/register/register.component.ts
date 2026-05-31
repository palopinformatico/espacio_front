import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [CommonModule,FormsModule,ReactiveFormsModule]
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  role = 'user'; // ⚡ puedes dejarlo fijo o seleccionar desde un select
  errorMessage = '';
  successMessage = '';

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  register() {
    this.authService.register({ username: this.username, password: this.password, role: this.role })
      .subscribe({
        next: () => {
          this.successMessage = 'Usuario registrado con éxito. Ahora puedes iniciar sesión.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: () => {
          this.errorMessage = 'No se pudo registrar el usuario.';
        }
      });
  }
}
