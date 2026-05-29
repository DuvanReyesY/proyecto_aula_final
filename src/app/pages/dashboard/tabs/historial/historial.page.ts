import { Component, OnInit, OnDestroy } from '@angular/core';
import { Mascota, MascotaService } from 'src/app/core/services/mascota.service';
import { UserService } from 'src/app/core/services/user.service';
import { CitaService } from 'src/app/core/services/cita.service'; // Inyectamos tu servicio de citas
import { Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { inject } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { ExpedientePage } from '../expediente/expediente.page';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: false
})
export class HistorialPage implements OnInit, OnDestroy {
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
    private citaSvc:     CitaService, // Agregado al constructor
    private router:      Router,
    private alertCtrl:   AlertController,
    private toastCtrl:   ToastController,
    private loadingCtrl: LoadingController,
    private modalCtrl:   ModalController,
    public authService: AuthService,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────

  async ngOnInit() {
    await this.inicializarSesion();
    this.cargarClientes();
    this.cargarMascotas();

    this.authService.privilegios$.pipe(takeUntil(this.destroy$)).subscribe(p => {
    this.privilegios = p;
  });
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
        this.clientes = users;
      });
  }

  getNombreCliente(idCliente: string): string {
    const c = this.clientes.find(x => x.idCliente === idCliente);
    if (!c) return '—';

    const nombre   = c.Nombre   ?? c.nombre   ?? '';
    const apellido = c.Apellido ?? c.apellido ?? '';
    return `${nombre} ${apellido}`.trim() || '—';
  }

  private cargarMascotas() {
    this.cargando = true;

    // 1. Determinar el flujo base de obtención de datos
    const obs$ = this.rolActual === 'cliente'
      ? this.mascotaSvc.getMascotasPorCliente(this.uidActual)
      : this.mascotaSvc.getTodas();

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (mascotas) => {
        
        // 2. CORRECCIÓN PRINCIPAL: Si es veterinario, filtra de forma cruzada usando sus citas
        if (this.rolActual === 'veterinario') {
          // Buscamos todas las citas globales o las citas asignadas a este veterinario de tu servicio
          this.citaSvc.getTodas().pipe(takeUntil(this.destroy$)).subscribe({
            next: (citas) => {
              // Filtrar citas correspondientes a este veterinario en específico
              const citasDelVet = citas.filter(c => c.idVeterinario === this.uidActual);
              
              // Almacenar en un set los IDs únicos de las mascotas que ha atendido
              const idMascotasAtendidas = new Set(citasDelVet.map(c => c.idMascota));

              // Filtrar la lista final de mascotas visibles
              this.mascotas = mascotas.filter(m => idMascotasAtendidas.has(m.idMascota));
              this.procesarRenderizadoLista();
            },
            error: () => {
              this.mostrarToast('Error al procesar el filtro de veterinario', 'danger');
              this.cargando = false;
            }
          });
        } else {
          // Si es Administrador, Recepcionista o Cliente, pasa directo sin el filtro cruzado
          this.mascotas = mascotas;
          this.procesarRenderizadoLista();
        }

      },
      error: () => {
        this.mostrarToast('Error al cargar las mascotas', 'danger');
        this.cargando = false;
      },
    });
  }

  // Centraliza la actualización de filtros tras procesar la procedencia del rol
  private procesarRenderizadoLista() {
    this.actualizarEspeciesDisponibles();
    this.filtrar();
    this.cargando = false;
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

  const rol = this.authService.getRolActual();

  const puedeVer =
    rol === 'administrador' ||
    rol === 'recepcionista' ||
    this.privilegios['verHistorialMascota'];

  if (!puedeVer) {
    await this.mostrarToast('No tienes permiso para ver el historial', 'warning');
    return;
  }

  const modal = await this.modalCtrl.create({
    component: ExpedientePage,
    componentProps: {
      idCliente: mascota.idCliente,
      idMascota: mascota.idMascota,
    },
    breakpoints: [0, 1],
    initialBreakpoint: 1,
  });

  await modal.present();
}
}