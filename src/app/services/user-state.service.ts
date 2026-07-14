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

  setUser(user: any) {
    console.log('🔍 UserStateService - setUser llamado con:', user);
    this.currentUserSubject.next(user);
    if (user) {
      this.userNameSubject.next(user.username || 'Usuario');
      this.userImageSubject.next('/logo.png');
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
}
