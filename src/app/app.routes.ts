import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin/admin.component';
import { UserComponent } from './user/user.component';
import { GarzonComponent } from './garzon/garzon.component';
import { MesaDetalleComponent } from './mesa-detalle/mesa-detalle.component';
import { NgModule } from '@angular/core';
import { LoginComponent } from './login/login.component';
import { RoleGuard } from './auth.guard';
import { NoAutorizadoComponent } from './no-autorizado/no-autorizado.component';
import { MesasComponent } from './pages/mesas/mesas.component';

export const routes: Routes = [
  { 
    path: 'garzon', 
    component: GarzonComponent, 
    canActivate: [RoleGuard],
    data: { role: ['garzon'] } 
  },
  { 
    path: 'admin', 
    component: AdminComponent, 
    canActivate: [RoleGuard],
    data: { role: ['admin'] } 
  },
  { path: 'user', component: UserComponent }, // sin guard, acceso libre
  { 
    path: 'mesa/:id', 
    component: MesaDetalleComponent, 
    canActivate: [RoleGuard],
    data: { role: ['garzon'] } 
  },
  { path: 'auth/entrar', component: LoginComponent },
  { path: '', redirectTo: 'user', pathMatch: 'full' },
  { path: 'no-autorizado', component: NoAutorizadoComponent }
];


@NgModule({
  imports: [RouterModule.forRoot(routes, {
  useHash: false    // o true si usas hash routing
})],
  exports: [RouterModule]
})
export class AppRoutingModule {}