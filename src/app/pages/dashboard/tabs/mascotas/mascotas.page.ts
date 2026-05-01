import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth';
import { inject } from '@angular/core';

import { MascotaService, Mascota } from 'src/app/core/services/mascota.service';
import { UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'app-mascotas',
  templateUrl: './mascotas.page.html',
  styleUrls: ['./mascotas.page.scss'],
  standalone: false,
})
export class MascotasPage implements OnInit, OnDestroy {

  mascotas: Mascota[]          = [];
  mascotasFiltradas: Mascota[] = [];
  clientes: any[]              = [];

  filtroBusqueda       = '';
  filtroEspecie        = 'todos';
  especiesDisponibles: string[] = [];

  cargando = true;

  rolActual   = '';
  uidActual   = '';
  puedeCrear  = false;
  puedeEditar = false;
  privilegios: any = {};

  private auth     = inject(Auth);
  private destroy$ = new Subject<void>();

  constructor(
    private mascotaSvc:  MascotaService,
    private userSvc:     UserService,
    private router:      Router,
    private alertCtrl:   AlertController,
    private toastCtrl:   ToastController,
    private loadingCtrl: LoadingController,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────

  async ngOnInit() {
    await this.inicializarSesion();
    this.cargarClientes();
    this.cargarMascotas();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Sesión / permisos ────────────────────────────────────────────

  private async inicializarSesion() {
    const user = this.auth.currentUser;
    if (!user) return;

    this.uidActual = user.uid;

    const roles = ['administradores', 'recepcionistas', 'veterinarios', 'clientes'];
    const rolMap: Record<string, string> = {
      administradores: 'administrador',
      recepcionistas:  'recepcionista',
      veterinarios:    'veterinario',
      clientes:        'cliente',
    };

    for (const coleccion of roles) {
      const data = await this.userSvc.getDocumentOnce(coleccion, user.uid);
      if (data) {
        this.rolActual = rolMap[coleccion];
        break;
      }
    }

    const privDoc = await this.userSvc.getDocumentOnce('privilegios', user.uid);
    this.privilegios = privDoc ?? {};

    this.puedeCrear = this.rolActual === 'administrador'
      || (this.rolActual === 'recepcionista' && this.privilegios['crearMascotas'] === true);

    this.puedeEditar = this.rolActual === 'administrador'
      || (this.rolActual === 'recepcionista' && this.privilegios['editarMascotas'] === true);
  }

  // ── Carga de datos ───────────────────────────────────────────────

  private cargarClientes() {
    this.userSvc.getTodosLosUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.clientes = users.filter(u => u.rol === 'cliente');
      });
  }

  private cargarMascotas() {
    this.cargando = true;

    const obs$ = this.rolActual === 'cliente'
      ? this.mascotaSvc.getMascotasPorCliente(this.uidActual)
      : this.mascotaSvc.getTodas();

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (mascotas) => {
        this.mascotas = mascotas;
        this.actualizarEspeciesDisponibles();
        this.filtrar();
        this.cargando = false;
      },
      error: () => {
        this.mostrarToast('Error al cargar las mascotas', 'danger');
        this.cargando = false;
      },
    });
  }

  // ── Filtros ──────────────────────────────────────────────────────

  private actualizarEspeciesDisponibles() {
    const set = new Set(
      this.mascotas.map(m => m.especie?.toLowerCase()).filter(Boolean)
    );
    this.especiesDisponibles = Array.from(set).sort();
  }

  filtrar() {
    const texto = this.filtroBusqueda.toLowerCase().trim();

    this.mascotasFiltradas = this.mascotas.filter(m => {
      const nombreCliente = this.getNombreCliente(m.idCliente).toLowerCase();

      const coincideTexto = !texto
        || m.nombre?.toLowerCase().includes(texto)
        || m.raza?.toLowerCase().includes(texto)
        || m.especie?.toLowerCase().includes(texto)
        || m.color?.toLowerCase().includes(texto)
        || nombreCliente.includes(texto);

      const coincideEspecie = this.filtroEspecie === 'todos'
        || m.especie?.toLowerCase() === this.filtroEspecie;

      return coincideTexto && coincideEspecie;
    });
  }

  setFiltroEspecie(especie: string) {
    this.filtroEspecie = especie;
    this.filtrar();
  }

  // ── Helpers template ─────────────────────────────────────────────

  getNombreCliente(idCliente: string): string {
    const c = this.clientes.find(x => x.idCliente === idCliente || x.uid === idCliente);
    if (!c) return '—';
    return `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim();
  }

  getIconoEspecie(especie: string): string {
    const iconos: Record<string, string> = {
      perro:  'paw-outline',
      gato:   'fish-outline',
      ave:    'bug-outline',
      reptil: 'leaf-outline',
      otro:   'ellipse-outline',
    };
    return iconos[especie?.toLowerCase()] ?? 'paw-outline';
  }

  trackById(_: number, mascota: Mascota): string {
    return mascota.idMascota;
  }

  // ── Navegación ───────────────────────────────────────────────────

  // En lugar de abrir un modal, navegar como usuarios:
    nuevaMascota() {
      this.router.navigate(['/layout/mascotas/register-mascota'], {
        queryParams: { modo: 'crear' }
      });
    }

    editarMascota(mascota: Mascota) {
      this.router.navigate(['/layout/mascotas/register-mascota'], {
        queryParams: { 
          id: mascota.idMascota, 
          idCliente: mascota.idCliente, 
          modo: 'editar' 
        }
      });
    }

  verDetalle(mascota: Mascota) {
    this.router.navigate(['/layout/mascotas', mascota.idMascota]);
  }



  // ── CRUD ─────────────────────────────────────────────────────────

  async cambiarEstado(mascota: Mascota) {
    const nuevoEstado: 'activo' | 'inactivo' =
      mascota.estado === 'activo' ? 'inactivo' : 'activo';
    const accion = nuevoEstado === 'inactivo' ? 'Desactivar' : 'Activar';

    const alert = await this.alertCtrl.create({
      header:  `${accion} mascota`,
      message: `¿Deseas ${accion.toLowerCase()} a <strong>${mascota.nombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: accion,
          handler: async () => {
            try {
              await this.mascotaSvc.cambiarEstado(mascota.idCliente, mascota.idMascota, nuevoEstado);
              this.mostrarToast(
                `${mascota.nombre} ${nuevoEstado === 'activo' ? 'activada' : 'desactivada'}`,
                'success'
              );
            } catch {
              this.mostrarToast('No se pudo cambiar el estado', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async eliminarMascota(mascota: Mascota) {
    const alert = await this.alertCtrl.create({
      header:  'Eliminar mascota',
      message: `Esta acción es <strong>irreversible</strong>. ¿Eliminar a <strong>${mascota.nombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();
            try {
              await this.mascotaSvc.eliminarMascota(mascota.idCliente, mascota.idMascota);
              this.mostrarToast(`${mascota.nombre} eliminada`, 'success');
            } catch {
              this.mostrarToast('Error al eliminar', 'danger');
            } finally {
              await loading.dismiss();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async abrirMigracion() {
    const opciones = this.mascotas
      .filter(m => m.estado === 'activo')
      .map(m => ({ type: 'radio' as const, label: m.nombre, value: m.idMascota }));

    const alert = await this.alertCtrl.create({
      header:  'Selecciona la mascota a migrar',
      inputs:  opciones,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: (idMascota: string) => {
            const mascota = this.mascotas.find(m => m.idMascota === idMascota);
            if (mascota) this.abrirMigracionDirecta(mascota);
          },
        },
      ],
    });
    await alert.present();
  }

  async abrirMigracionDirecta(mascota: Mascota) {
    handler: async (nuevoIdCliente: string) => {
  if (!nuevoIdCliente) return;
  try {
    // 1. Crear en la nueva subcolección
    const datosMigrados = { ...mascota, idCliente: nuevoIdCliente };
    await this.mascotaSvc.registrarMascota(datosMigrados);
    // 2. Eliminar de la subcolección anterior
    await this.mascotaSvc.eliminarMascota(mascota.idCliente, mascota.idMascota);
    this.mostrarToast(`${mascota.nombre} migrada correctamente`, 'success');
  } catch {
    this.mostrarToast('Error al migrar la mascota', 'danger');
  }
}
  }

  // ── Utilidades ───────────────────────────────────────────────────

  private async mostrarToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      buttons: [{ icon: 'close-outline', role: 'cancel' }],
    });
    await toast.present();
  }

  calcularEdad(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}


}