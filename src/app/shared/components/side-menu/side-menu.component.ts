import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss'],
  standalone: false
})
export class SideMenuComponent {

  @Input() nombreUsuario: string = '';
  @Input() rol: string = '';
  @Input() menuItems: any[] = [];

  @Output() logoutEvent = new EventEmitter<void>();

  logout() {
    this.logoutEvent.emit();
  }
}