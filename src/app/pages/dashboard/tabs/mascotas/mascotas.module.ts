import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MascotasPageRoutingModule } from './mascotas-routing.module';
import { MascotasPage } from './mascotas.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MascotasPageRoutingModule,
    SharedModule
  ],
  declarations: [MascotasPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MascotasPageModule {}