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

@NgModule({
  declarations: [TabBarComponent, SideMenuComponent, DashboardHeaderComponent, PrivilegiosModalComponent, ClienteSelectorComponent],
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, ReactiveFormsModule], 
  exports: [TabBarComponent, SideMenuComponent, DashboardHeaderComponent, PrivilegiosModalComponent, ClienteSelectorComponent, ReactiveFormsModule] 
})
export class SharedModule {}