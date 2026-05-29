import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss'],
  standalone: false
})
export class SideMenuComponent {

@Input()  uid            = '';
@Input()  nombreUsuario  = '';
@Input()  rol            = '';
@Input()  menuItems: any[] = [];
@Output() logoutEvent       = new EventEmitter<void>();
@Output() irConfiguracion   = new EventEmitter<void>();   // ← nuevo

get iniciales(): string {
  const partes = this.nombreUsuario.trim().split(' ');
  return (partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '');
}

  logout() {
    this.logoutEvent.emit();
  }

  irAConfiguracion() {
    this.irConfiguracion.emit();
  }
}