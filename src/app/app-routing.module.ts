import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/dashboard/layout.module').then(m => m.LayoutPageModule)
  },
  // ✅ Agrega esta ruta — es la que usan todos tus componentes internos
  {
    path: 'layout',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/dashboard/layout.module').then(m => m.LayoutPageModule)
  },
  { path: '**', redirectTo: 'login' },
  {
    path: 'register-mascota',
    loadChildren: () => import('./pages/register-mascota/register-mascota.module').then( m => m.RegisterMascotaPageModule)
  },
 /*  {
    path: 'expediente',
    loadChildren: () => import('./pages/dashboard/tabs/expediente/expediente.module').then( m => m.ExpedientePageModule)
  }, */
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}