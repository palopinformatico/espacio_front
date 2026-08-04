import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private userNameSubject = new BehaviorSubject<string>('Usuario');
  public userName$ = this.userNameSubject.asObservable();

  private userImageSubject = new BehaviorSubject<string>('/logo.png');
  public userImage$ = this.userImageSubject.asObservable();

  private activeTabSubject = new BehaviorSubject<string | null>(null);
  public activeTab$ = this.activeTabSubject.asObservable();

  setUser(user: any) {
    console.log('🔍 UserStateService - setUser llamado con:', user);
    this.currentUserSubject.next(user);
    if (user) {
      this.userNameSubject.next(user.username || 'Usuario');
      // Usar la imagen de perfil del usuario si está disponible
      const profileImage = user.profileImage || user.image || user.avatar || '/logo.png';
      console.log('🔍 UserStateService - Imagen de perfil seleccionada:', profileImage);
      console.log('🔍 UserStateService - Campos disponibles:', {
        profileImage: user.profileImage,
        image: user.image,
        avatar: user.avatar
      });
      this.userImageSubject.next(profileImage);
    } else {
      this.userNameSubject.next('Usuario');
      this.userImageSubject.next('/logo.png');
    }
  }

  getUser(): any {
    return this.currentUserSubject.value;
  }

  clearUser() {
    console.log('🔍 UserStateService - clearUser llamado');
    this.currentUserSubject.next(null);
    this.userNameSubject.next('Usuario');
    this.userImageSubject.next('/logo.png');
  }

  getCurrentUser(): Observable<any> {
    return this.currentUser$;
  }

  getUserName(): Observable<string> {
    return this.userName$;
  }

  getUserImage(): Observable<string> {
    return this.userImage$;
  }

  setActiveTab(tab: string) {
    console.log('🔍 UserStateService - setActiveTab llamado con:', tab);
    this.activeTabSubject.next(tab);
  }

  getActiveTab(): Observable<string | null> {
    return this.activeTab$;
  }

  clearActiveTab() {
    this.activeTabSubject.next(null);
  }
}
