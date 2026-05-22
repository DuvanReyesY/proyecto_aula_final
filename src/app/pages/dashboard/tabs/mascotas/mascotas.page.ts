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
import { ModalController } from '@ionic/angular'; 
import { MascotaService, Mascota } from 'src/app/core/services/mascota.service';
import { UserService } from 'src/app/core/services/user.service';
import { RegisterMascotaPage } from 'src/app/pages/register-mascota/register-mascota.page';
import { MigrarMascotaComponent } from 'src/app/shared/components/migrar-mascota/migrar-mascota.component';
import { MascotaDetalleComponent } from 'src/app/shared/components/mascota-detalle/mascota-detalle.component';

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
    private modalCtrl:   ModalController,
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
  // ✅ Leer desde localStorage (ya lo guardó AuthService en el login)
  const uid = localStorage.getItem('uid');
  const rol = localStorage.getItem('rol');

  if (!uid || !rol) return;

  this.uidActual = uid;
  this.rolActual = rol;

  // ✅ Solo buscar privilegios, el rol ya lo tienes
  const privDoc = await this.userSvc.getDocumentOnce('privilegios', uid);
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
      // Sin filtrar por rol para no perder datos
      this.clientes = users;
    });
}

getNombreCliente(idCliente: string): string {
  const c = this.clientes.find(x => x.idCliente === idCliente);
  if (!c) return '—';

  // ✅ Firestore guarda Nombre/Apellido en mayúscula
  const nombre   = c.Nombre   ?? c.nombre   ?? '';
  const apellido = c.Apellido ?? c.apellido ?? '';
  return `${nombre} ${apellido}`.trim() || '—';
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
async nuevaMascota() {
  console.log( 'Rol:', this.rolActual);
  const modal = await this.modalCtrl.create({
    component: RegisterMascotaPage,
    componentProps: { modo: 'crear' },
    breakpoints: [0, 1],
    initialBreakpoint: 1,
  });
  await modal.present();
  const { data } = await modal.onWillDismiss();
  if (data?.guardado) {
    this.mostrarToast('Mascota registrada exitosamente', 'success');
  }
}

async editarMascota(mascota: Mascota) {
  const modal = await this.modalCtrl.create({
    component: RegisterMascotaPage,
    componentProps: {
      modo: 'editar',
      mascotaId: mascota.idMascota,
      clienteId: mascota.idCliente,
    },
    breakpoints: [0, 1],
    initialBreakpoint: 1,
  });
  await modal.present();
  const { data } = await modal.onWillDismiss();
  if (data?.guardado) {
    this.mostrarToast('Mascota actualizada', 'success');
  }
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
      const modal = await this.modalCtrl.create({
        component: MigrarMascotaComponent,
        componentProps: { mascota },
        breakpoints: [0, 0.85, 1],
        initialBreakpoint: 0.85,
      });

      await modal.present();

      const { data } = await modal.onWillDismiss();
      if (data?.migrado) {
        // El observable ya se actualiza solo si usas getTodas()
        // pero si tienes lista local, recárgala aquí
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

async verDetalleMascota(mascota: Mascota) {
  const modal = await this.modalCtrl.create({
    component: MascotaDetalleComponent,
    componentProps: { mascota },
    breakpoints: [0, 0.92, 1],
    initialBreakpoint: 0.92,
  });
  await modal.present();

  const { data } = await modal.onWillDismiss();
  if (data?.editar) {
    this.editarMascota(data.editar);
  }
}

}