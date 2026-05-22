import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
import { PrivilegiosModalComponent } from './components/privilegios-modal/privilegios-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; 
import { ClienteSelectorComponent } from './components/cliente-selector/cliente-selector.component';
import { MigrarMascotaComponent } from './components/migrar-mascota/migrar-mascota.component';
import { ReasignarVeterinarioComponent } from './components/reasignar-veterinario/reasignar-veterinario.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { MascotaDetalleComponent } from './components/mascota-detalle/mascota-detalle.component';
import { HistorialCitasComponent } from './components/historial-citas/historial-citas.component';

@NgModule({
  declarations: [TabBarComponent, SideMenuComponent, DashboardHeaderComponent, PrivilegiosModalComponent, ClienteSelectorComponent, MigrarMascotaComponent, ReasignarVeterinarioComponent, CalendarGridComponent, MascotaDetalleComponent, HistorialCitasComponent],
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, ReactiveFormsModule], 
  exports: [TabBarComponent, SideMenuComponent, DashboardHeaderComponent, PrivilegiosModalComponent, ClienteSelectorComponent, ReactiveFormsModule, FormsModule, MigrarMascotaComponent, ReasignarVeterinarioComponent, CalendarGridComponent, MascotaDetalleComponent, HistorialCitasComponent] 
})
export class SharedModule {}