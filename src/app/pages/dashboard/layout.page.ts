import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { PrivilegiosService } from 'src/app/core/services/privilegios.service';
// ✅ Removido rolGuard — no se usa en el componente

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: false
})
export class LayoutPage implements OnInit {

  rol: string = '';
  uid: string = '';
  nombreUsuario: string = '';

  privilegios: any = {};
  tabs: any[] = [];
  menuItems: any[] = [];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private privilegiosService: PrivilegiosService
  ) {}

  async ngOnInit() {
    this.rol = this.authService.getRolActual() ?? '';
    this.uid = this.authService.getUidActual() ?? '';

    const coleccion = this.userService.getColeccionPorRol(this.rol);
    const userData  = await this.userService.getDocumentOnce(coleccion, this.uid);
    this.nombreUsuario = userData
      ? `${userData.Nombre ?? ''} ${userData.Apellido ?? ''}`.trim()
      : this.uid;

    if (this.rol === 'recepcionista' || this.rol === 'veterinario' || this.rol === 'cliente') {
      this.privilegiosService.getPrivilegios(this.uid).subscribe(p => {
        this.privilegios = p ?? {};
        this.construirNavegacion();
      });
    } else {
      this.construirNavegacion();
    }
  }

  construirNavegacion() {
    const esAdmin         = this.rol === 'administrador';
    const esRecepcionista = this.rol === 'recepcionista';
    const esVeterinario   = this.rol === 'veterinario';
    const esCliente       = this.rol === 'cliente';
    const esStaff         = esAdmin || esRecepcionista || esVeterinario; // ✅ Agrupador útil

    const p = this.privilegios;

    const puedeVerUsuarios   = esAdmin || (esRecepcionista && p['verUsuarios']);
    const puedeVerMascotas   = esAdmin || (esRecepcionista && p['verMascotas'])
                                       || (esVeterinario   && p['verHistorialMascota'])
                                       || esCliente;
    const puedeVerCitas      = esAdmin || (esRecepcionista && p['verCitas'])
                                       || (esVeterinario   && p['verCitasAsignadas'])
                                       || esCliente;
    const puedeVerHistorial  = esAdmin || (esVeterinario   && p['verHistorialMascota']);
    const puedeVerCalendario = esAdmin || (esCliente       && p['verCalendario']);

    this.menuItems = [
      {
        label: 'Inicio',
        icon: 'home-outline',
        ruta: '/layout/dashboard',
        visible: esStaff        // ✅ Solo staff ve este inicio
      },
      {
        label: 'Inicio',        // ✅ Mismo label, ruta distinta para el cliente
        icon: 'home-outline',
        ruta: '/layout/cliente-home',
        visible: esCliente      // ✅ Solo clientes ven este inicio
      },
      {
        label: 'Usuarios',
        icon: 'people-outline',
        ruta: '/layout/usuarios',
        visible: puedeVerUsuarios
      },
      {
        label: 'Mascotas',
        icon: 'paw-outline',
        ruta: '/layout/mascotas',
        visible: puedeVerMascotas && !esCliente // ✅ Clientes ven mascotas desde su inicio, no necesitan este menú
      },
      {
        label: 'Citas',
        icon: 'calendar-outline',
        ruta: '/layout/citas',
        visible: puedeVerCitas && !esCliente // ✅ Clientes ven citas desde su inicio, no necesitan este menú
      },
      {
        label: 'Historial Médico',
        icon: 'document-text-outline',
        ruta: '/layout/historial',
        visible: puedeVerHistorial
      },
      {
        label: 'Configuración',
        icon: 'settings-outline',
        ruta: '/layout/configuracion',
        visible: esAdmin
      },
      {
        label: 'Diagnosticar Citas',
        icon: 'home-outline',
        ruta: '/layout/veterinario-home',
        visible: esVeterinario
      }

    ];

    this.tabs = [
      {
        tab: 'dashboard',
        href: '/layout/dashboard',
        icon: 'home-outline',
        label: 'Inicio',
        visible: esStaff        // ✅ Solo staff
      },
      {
        tab: 'cliente-home',    // ✅ Corregido: tab y href faltaban
        href: '/layout/cliente-home',
        icon: 'home-outline',
        label: 'Inicio',
        visible: esCliente      // ✅ Solo clientes
      },
      {
        tab: 'veterinario-home',
        href: '/layout/veterinario-home',
        icon: 'home-outline',
        label: 'Inicio',
        visible: esVeterinario
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
      },
      {
        tab: 'reportes',
        href: '/layout/reportes',
        icon: 'bar-chart-outline',
        label: 'Reportes',
        visible: esAdmin           // ✅ Solo admin
      },
      {
        tab: 'configuracion',
        href: '/layout/configuracion',
        icon: 'settings-outline',
        label: 'Configuración',
        visible: esAdmin           // ✅ Solo admin
      }
    ];
  }

  logout() {
    this.authService.logout();
  }
}
