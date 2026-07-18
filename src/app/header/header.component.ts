import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { UserStateService } from '../services/user-state.service';
import { jwtDecode } from 'jwt-decode';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private userStateService = inject(UserStateService);

  currentUser: any = null;
  private isLoggingOut = false;

  userName = 'Usuario';
  userImage = '/logo.png';

  private userSubscription?: Subscription;
  private userNameSubscription?: Subscription;
  private userImageSubscription?: Subscription;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  ngOnInit(): void {
    console.log('🔍 Header ngOnInit - Cargando usuario actual');
    this.subscribeToUserState();
    this.loadCurrentUser();
  }

  subscribeToUserState(): void {
    console.log('🔍 Suscribiéndose a UserStateService');
    this.userSubscription = this.userStateService.getCurrentUser().subscribe(user => {
      console.log('🔍 currentUser$ emitio:', user);
      this.currentUser = user;
      this.cdr.detectChanges();
    });

    this.userNameSubscription = this.userStateService.getUserName().subscribe(name => {
      console.log('🔍 userName$ emitio:', name);
      this.userName = name;
      this.cdr.detectChanges();
    });

    this.userImageSubscription = this.userStateService.getUserImage().subscribe(image => {
      console.log('🔍 userImage$ emitio:', image);
      this.userImage = image;
      this.cdr.detectChanges();
    });
  }

  loadCurrentUser(): void {
    console.log('🔍 loadCurrentUser llamado');
    // Si está en proceso de logout, no hacer nada
    if (this.isLoggingOut) {
      console.log('🔍 isLoggingOut es true, retornando');
      return;
    }

    const user = this.authService.getUser();
    console.log('🔍 Usuario desde AuthService:', user);
    if (user) {
      this.userStateService.setUser(user);
      console.log('🔍 Usuario guardado en UserStateService');
    } else {
      console.log('🔍 No hay usuario en token');
    }
  }

  getProfileImageUrl(profileImage: string): string {
    // Si no hay imagen, usar el logo por defecto
    if (!profileImage || profileImage === 'null' || profileImage === 'undefined') {
      return '/logo.png';
    }

    // Si ya es una URL completa, devolverla tal cual
    if (profileImage.startsWith('http')) {
      return profileImage;
    }

    // Si empieza con /uploads/, agregar el dominio base
    if (profileImage.startsWith('/uploads/')) {
      return `https://espacioboulevard.com${profileImage}`;
    }

    // Si empieza con uploads/ (sin barra inicial), agregar barra y dominio
    if (profileImage.startsWith('uploads/')) {
      return `https://espacioboulevard.com/${profileImage}`;
    }

    // Para cualquier otro caso, asumir que es solo el nombre del archivo
    return `https://espacioboulevard.com/uploads/profile-images/${profileImage}`;
  }

  logout() {
    // Limpiar todo primero
    this.authService.logout();
    this.userStateService.clearUser();

    // Resetear estado del componente
    this.currentUser = null;
    this.userName = 'Usuario';
    this.userImage = '/logo.png';

    // Forzar limpieza completa del navegador y recargar para actualizar UI
    this.router.navigate(['']).then(() => {
      window.location.reload();
    });
  }

  goToLogin() {
    this.router.navigate(['/auth/entrar']);
  }

  navigateToHome() {
    console.log('🔍 navigateToHome llamado');
    let userRole = this.currentUser?.role || this.authService.getUserRole();
    console.log('🔍 Rol del usuario para navegación:', userRole);
    console.log('🔍 currentUser:', this.currentUser);

    // Fallback a localStorage si no se obtiene el rol
    if (!userRole) {
      userRole = localStorage.getItem('role');
      console.log('🔍 Rol obtenido de localStorage:', userRole);
    }

    let targetRoute = '/';

    if (userRole === 'admin') {
      targetRoute = '/admin';
      this.userStateService.setActiveTab('pedido');
    } else if (userRole === 'garzon') {
      targetRoute = '/garzon';
      this.userStateService.setActiveTab('pedido');
    }

    console.log('🔍 Navegando a:', targetRoute);
    this.router.navigate([targetRoute]).then(() => {
      console.log('🔍 Navegación completada a:', targetRoute);
    });
  }

  ngOnDestroy(): void {
    console.log('🔍 Header ngOnDestroy - Componente destruido');
    this.userSubscription?.unsubscribe();
    this.userNameSubscription?.unsubscribe();
    this.userImageSubscription?.unsubscribe();
  }
}
