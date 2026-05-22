// tab-bar.component.ts
import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular'; // ✅ IMPORTANTE
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
  esAndroid: boolean = false; // ✅ Controla visibilidad
  privilegios: any = {
    verReportes: false
  };

  constructor(
    private authService: AuthService,
    private privilegiosService: PrivilegiosService,
    private platform: Platform // ✅ Inyectar Platform
  ) {}

  ngOnInit() {
    // ✅ Detecta si está corriendo en Android
    this.esAndroid = this.platform.is('android');

    // ❌ Si no es Android, no construye tabs
    if (!this.esAndroid) return;

    this.rol = this.authService.getRolActual() ?? '';

    if (
      this.rol === 'recepcionista' ||
      this.rol === 'veterinario' ||
      this.rol === 'cliente'
    ) {
      this.privilegiosService.getPrivilegios(this.authService.getUidActual() ?? '')
        .subscribe(p => {
          this.privilegios = p ?? this.privilegios;
          this.construirTabs();
        });
    } else {
      this.construirTabs();
    }
  }

  construirTabs() {
    const esAdmin         = this.rol === 'administrador';
    const esRecepcionista = this.rol === 'recepcionista';
    const esVeterinario   = this.rol === 'veterinario';
    const esCliente       = this.rol === 'cliente';
    const esStaff         = esAdmin || esRecepcionista || esVeterinario;

    const p = this.privilegios;

    const puedeVerUsuarios   = esAdmin || (esRecepcionista && p['verUsuarios']);
    const puedeVerMascotas   = esAdmin || (esRecepcionista && p['verMascotas'])
                                       || (esVeterinario && p['verHistorialMascota'])
                                       || esCliente;
    const puedeVerCitas      = esAdmin || (esRecepcionista && p['verCitas'])
                                       || (esVeterinario && p['verCitasAsignadas'])
                                       || esCliente;
    const puedeVerHistorial  = esAdmin || (esVeterinario && p['verHistorialMascota']);

    this.tabs = [
      {
        tab: 'dashboard',
        href: '/layout/dashboard',
        icon: 'home-outline',
        label: 'Inicio',
        visible: esStaff
      },
      {
        tab: 'cliente-home',
        href: '/layout/cliente-home',
        icon: 'home-outline',
        label: 'Inicio',
        visible: esCliente
      },
      {
        tab: 'usuarios',
        href: '/layout/usuarios',
        icon: 'people-outline',
        label: 'Usuarios',
        visible: puedeVerUsuarios
      },
      {
        tab: 'mascotas',
        href: '/layout/mascotas',
        icon: 'paw-outline',
        label: 'Mascotas',
        visible: puedeVerMascotas
      },
      {
        tab: 'citas',
        href: '/layout/citas',
        icon: 'calendar-outline',
        label: 'Citas',
        visible: puedeVerCitas
      },
      {
        tab: 'historial',
        href: '/layout/historial',
        icon: 'document-text-outline',
        label: 'Historial',
        visible: puedeVerHistorial
      }
    ].filter(t => t.visible);
  }
}