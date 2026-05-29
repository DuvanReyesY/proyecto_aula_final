import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { LayoutPage } from './layout.page';
import { SharedModule } from 'src/app/shared/shared.module';
import { rolGuard } from 'src/app/core/guards/rol.guard';

const routes: Routes = [
  {
    path: '',
    component: LayoutPage,
    children: [

      // ── Staff (admin, recepcionista, veterinario) ───────────────────────
      {
        path: 'dashboard',
        canActivate: [rolGuard(['administrador', 'recepcionista', 'veterinario'])],
        loadChildren: () => import('./tabs/home/home.module').then(m => m.HomePageModule)
      },

      // ── Solo cliente ────────────────────────────────────────────────────
      {
        path: 'cliente-home',
        canActivate: [rolGuard(['cliente'])],
        loadChildren: () => import('./tabs/cliente-home/cliente-home.module').then(m => m.ClienteHomePageModule)
      },

      // ── Solo veterinario ────────────────────────────────────────────────
      {
        path: 'veterinario-home',
        canActivate: [rolGuard(['veterinario'])],
        loadChildren: () => import('./tabs/home-veterinario/home-veterinario.module').then(m => m.HomeVeterinarioPageModule)
      },

      // ── Admin + Recepcionista ───────────────────────────────────────────
      {
        path: 'usuarios',
        canActivate: [rolGuard(['administrador', 'recepcionista'])],
        loadChildren: () => import('./tabs/usuarios/usuarios.module').then(m => m.UsuariosPageModule)
      },

      // ── Admin + Recepcionista + Veterinario ─────────────────────────────
      {
        path: 'mascotas',
        canActivate: [rolGuard(['administrador', 'recepcionista', 'veterinario'])],
        loadChildren: () => import('./tabs/mascotas/mascotas.module').then(m => m.MascotasPageModule)
      },
      {
        path: 'citas',
        canActivate: [rolGuard(['administrador', 'recepcionista', 'veterinario'])],
        loadChildren: () => import('./tabs/citas/citas.module').then(m => m.CitasPageModule)
      },

      // ── Admin + Veterinario ─────────────────────────────────────────────
      {
        path: 'historial',
        canActivate: [rolGuard(['administrador', 'veterinario'])],
        loadChildren: () => import('./tabs/historial/historial.module').then(m => m.HistorialPageModule)
      },

      // ── general ──────────────────────────────────────────────────────
      {
        path: 'configuracion',
        loadChildren: () => import('./tabs/configuracion/configuracion.module').then(m => m.ConfiguracionPageModule)
      },
      {
        path: 'reportes',
        canActivate: [rolGuard(['administrador'])],
        loadChildren: () => import('./tabs/reportes/reportes.module').then(m => m.ReportesPageModule)
      },

      // ── Sin guard (accesibles por varios roles con params) ──────────────
      {
        path: 'editar/:uid/:rol',
        loadChildren: () => import('src/app/pages/register/register.module').then(m => m.RegisterPageModule)
      },
      {
        path: 'expediente/:idCliente/:idMascota',
        loadChildren: () => import('./tabs/expediente/expediente.module').then(m => m.ExpedientePageModule)
      },

      // ── Redirección por defecto ─────────────────────────────────────────
      // El guard de dashboard redirigirá al cliente a su home automáticamente
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  declarations: [LayoutPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LayoutPageModule {}