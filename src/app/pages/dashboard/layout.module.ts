import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {  LayoutPage } from './layout.page';
import { SharedModule } from 'src/app/shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: LayoutPage,
    children: [
      {
        path: 'dashboard',                 // ✅ cambiado de 'home' a 'dashboard'
        loadChildren: () => import('./tabs/home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./tabs/usuarios/usuarios.module').then(m => m.UsuariosPageModule)
      },
      {
        path: 'mascotas',
        loadChildren: () => import('./tabs/mascotas/mascotas.module').then(m => m.MascotasPageModule)
      },
      {
        path: 'citas',
        loadChildren: () => import('./tabs/citas/citas.module').then(m => m.CitasPageModule)
      },
      {
        path: 'historial',
        loadChildren: () => import('./tabs/historial/historial.module').then(m => m.HistorialPageModule)
      },
      {
      path: 'editar/:uid/:rol',              // ✅ misma página, distintos params
      loadChildren: () => import('src/app/pages/register/register.module')
        .then(m => m.RegisterPageModule)
      },
      {
        path: 'reportes',
        loadChildren: () => import('./tabs/reportes/reportes.module').then(m => m.ReportesPageModule)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }  // ✅ cambiado de 'home'
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
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // ← único cambio
})
export class LayoutPageModule {}