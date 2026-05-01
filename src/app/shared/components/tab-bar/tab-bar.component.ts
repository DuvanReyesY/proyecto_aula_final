import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { PrivilegiosService } from 'src/app/core/services/privilegios.service';

@Component({
  selector: 'app-tab-bar',
  templateUrl: './tab-bar.component.html',
  styleUrls: ['./tab-bar.component.scss'],
  standalone: false
})
export class TabBarComponent implements OnInit {
  tabs: any[] = [];
  rol: string = '';
  privilegios: any = {
    verReportes: false
  };

  constructor(
    private authService: AuthService,
    private privilegiosService: PrivilegiosService
  ) {}

  ngOnInit() {
    this.rol = this.authService.getRolActual() ?? '';

    if (this.rol === 'recepcionista' || this.rol === 'veterinario') {
      this.privilegiosService.getPrivilegios(this.rol).subscribe(p => {
        this.privilegios = p ?? this.privilegios;
        this.construirTabs();
      });
    } else {
      this.construirTabs();
    }
  }

  construirTabs() {
    const esAdmin        = this.rol === 'administrador';
    const esRecepcionista = this.rol === 'recepcionista';
    const esVeterinario  = this.rol === 'veterinario';
    const esCliente      = this.rol === 'cliente';

    this.tabs = [
      {
        tab: 'home',
        href: '/dashboard/home',
        icon: 'home-outline',
        label: 'Inicio',
        visible: true
      },
      {
        tab: 'usuarios',
        href: '/dashboard/usuarios',
        icon: 'people-outline',
        label: 'Usuarios',
        visible: esAdmin || esRecepcionista
      },
      {
        tab: 'mascotas',
        href: '/dashboard/mascotas',
        icon: 'paw-outline',
        label: 'Mascotas',
        visible: esAdmin || esRecepcionista || esVeterinario || esCliente
      },
      {
        tab: 'citas',
        href: '/dashboard/citas',
        icon: 'calendar-outline',
        label: 'Citas',
        visible: true
      },
      {
        tab: 'reportes',
        href: '/dashboard/reportes',
        icon: 'bar-chart-outline',
        label: 'Reportes',
        visible: esAdmin || this.privilegios.verReportes
      }
    ].filter(t => t.visible);
  }
}