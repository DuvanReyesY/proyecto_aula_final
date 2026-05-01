import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-header',
  templateUrl: './dashboard-header.component.html',
  styleUrls: ['./dashboard-header.component.scss'],
  standalone: false
})
export class DashboardHeaderComponent {

  @Input() rol: string = '';

  get titulo(): string {
    return this.rol === 'administrador'
      ? 'Panel Admin'
      : this.rol === 'veterinario'
      ? 'Panel Veterinario'
      : this.rol === 'recepcionista'
      ? 'Panel Recepcionista'
      : 'Mi Panel';
  }
}