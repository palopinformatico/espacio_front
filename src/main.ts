import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom, isDevMode } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AdminComponent } from './app/admin/admin.component';
import { UserComponent } from './app/user/user.component';
import { GarzonComponent } from './app/garzon/garzon.component';
import { MesasComponent } from './app/pages/mesas/mesas.component';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideEffects } from '@ngrx/effects';
import { provideRouter } from '@angular/router';
import { MesaDetalleComponent } from './app/mesa-detalle/mesa-detalle.component';
import { LoginComponent } from './app/login/login.component';
import { RegisterComponent } from './app/register/register.component';

export const appConfig = {
  providers: [
    importProvidersFrom(HttpClientModule),
    provideRouter([
      { path: 'admin', component: AdminComponent },
      { path: 'user', component: UserComponent },
      { path: 'garzon', component: GarzonComponent },
      { path: 'mesa/:id', component: MesaDetalleComponent },
      { path: 'garzon', component: GarzonComponent },
      { path: 'auth/entrar', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: '', redirectTo: 'user', pathMatch: 'full' }
    ]),
    provideStore(),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideEffects(),
  ],
};

bootstrapApplication(AppComponent, appConfig);
