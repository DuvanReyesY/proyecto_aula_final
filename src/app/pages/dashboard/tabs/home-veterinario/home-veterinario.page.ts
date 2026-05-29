import { Component, OnInit, inject } from '@angular/core';
import { Firestore, doc, getDoc, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/core/services/auth.service';
import { CitaService, Cita } from 'src/app/core/services/cita.service';
import { ModalController } from '@ionic/angular';
import { DiagnosticoModalComponent } from 'src/app/shared/components/diagnostico-modal/diagnostico-modal.component';
import { DiagnosticoService } from 'src/app/core/services/diagnostico.service';
import { UserService } from 'src/app/core/services/user.service';
import {
  AlertController,
  ToastController,
  LoadingController,
} from '@ionic/angular';

export interface ResumenVeterinario {
  citasHoy:       number;
  citasPendientes: number;
  pacientesAtendidos: number;
  proximaCita:    Cita | null;
}

@Component({
  selector:    'app-home-veterinario',
  templateUrl: './home-veterinario.page.html',
  styleUrls:   ['./home-veterinario.page.scss'],
  standalone:  false,
})
export class HomeVeterinarioPage implements OnInit {
  private modalCtrl       = inject(ModalController);
  private diagnosticoSvc  = inject(DiagnosticoService);
  private toastCtrl       = inject(ToastController);
  private loadingCtrl     = inject(LoadingController);


  private auth      = inject(AuthService);
  private firestore = inject(Firestore);
  private citaService = inject(CitaService);

  existeDiagnostico = false;
  citaSeleccionada: Cita | null = null;
  modalDetalleOpen = false;
  privilegios: any = {};

  // ── Datos del veterinario logueado ──────────────────────────────
  vetUid    = '';
  vetNombre = '';
  vetApellido = '';
  vetEspecialidad = '';

  // ── Streams para el calendario ──────────────────────────────────
  todasCitas$:   Observable<Cita[]> = of([]);
  veterinarios$: Observable<any[]>  = of([]);

  // ── Resumen del día ─────────────────────────────────────────────
  resumen: ResumenVeterinario = {
    citasHoy:            0,
    citasPendientes:     0,
    pacientesAtendidos:  0,
    proximaCita:         null,
  };

  today = new Date();

  constructor(
    public authService: AuthService,
  ) {}

  get todayStr(): string {
    const d = this.today;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  get saludoHora(): string {
    const h = this.today.getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  // ── Opciones de menú rápido ─────────────────────────────────────
  // Solo las acciones que PrivilegiosVeterinario permite:
  //   verCitasAsignadas | diagnosticarCitas | verHistorialMascota
  accionesRapidas = [
    {
      icon:  '🗓',
      label: 'Mis citas',
      sub:   'Pendientes y confirmadas',
      ruta:  '/layout/citas',
    },
    {
      icon:  '📋',
      label: 'Diagnosticar',
      sub:   'Registrar diagnóstico',
      ruta:  '/layout/citas',   // abre listado para elegir cita
    },
    {
      icon:  '🐾',
      label: 'Historial',
      sub:   'Ver historial de mascotas',
      ruta:  '/layout/mascotas',
    },
  ];

  ngOnInit() {
    this.vetUid = this.auth.getUidActual() ?? '';
    this.cargarPerfil();
    this.cargarCitas();

    this.auth.privilegios$.subscribe(p => {
    this.privilegios = p;
  });
  }

  // ── Carga perfil del veterinario ────────────────────────────────
  async cargarPerfil() {
    if (!this.vetUid) return;
    const snap = await getDoc(doc(this.firestore, 'veterinarios', this.vetUid));
    if (snap.exists()) {
      const data = snap.data() as any;
      this.vetNombre      = data.Nombre      ?? '';
      this.vetApellido    = data.Apellido    ?? '';
      this.vetEspecialidad = data.Especialidad ?? '';
    }
  }

  // ── Carga TODAS las citas para el calendario ────────────────────
  // El calendario recibe todas las citas pero el veterinario solo
  // puede interactuar con las suyas (dimmed = las ajenas).
  // Se pasa también su propio veterinario como lista unitaria para
  // que CalendarGridComponent coloree correctamente.
  cargarCitas() {
    // Todas las citas (para mostrar las ajenas en modo "read-only dimmed")
    // home-veterinario.page.ts  ~línea 108
  this.todasCitas$ = this.citaService.getPorVeterinario(this.vetUid);  // ← era getCitas()

    // Veterinarios: solo él mismo, para que el sidebar muestre su color
    this.todasCitas$.subscribe(citas => {
      this.calcularResumen(citas);
    });

    // Lista de veterinarios para el CalendarGrid (solo el actual)
    this.veterinarios$ = of([{
      uid:         this.vetUid,
      idVeterinario: this.vetUid,
      Nombre:      this.vetNombre,
      Apellido:    this.vetApellido,
    }]);
  }

  // ── Resumen de métricas ─────────────────────────────────────────
  calcularResumen(citas: Cita[]) {
    const misCitas = citas.filter(c => c.idVeterinario === this.vetUid);
    const hoy      = misCitas.filter(c => c.fecha === this.todayStr);

    const ahora    = `${String(this.today.getHours()).padStart(2,'0')}:${String(this.today.getMinutes()).padStart(2,'0')}`;

    const proxima  = hoy
      .filter(c => !['finalizada','cancelada','no_asistio'].includes(c.estado) && c.horaInicio >= ahora)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0] ?? null;

    this.resumen = {
      citasHoy:            hoy.length,
      citasPendientes:     misCitas.filter(c => c.estado === 'pendiente').length,
      pacientesAtendidos:  misCitas.filter(c => c.estado === 'finalizada').length,
      proximaCita:         proxima,
    };
  }

  // ── Handler: clic en cita del calendario ───────────────────────
  // Solo abre el detalle si la cita pertenece al vet logueado
async onCitaClick(cita: Cita) {
  if (cita.idVeterinario !== this.vetUid) return;
  if (cita.estado === 'cancelada' || cita.estado === 'no_asistio') return;

  // Validar privilegio
  const puedeDiagnosticar = this.auth.tienePrivilegio('diagnosticarCitas');
  if (!puedeDiagnosticar) {
    const toast = await this.toastCtrl.create({
      message: 'No tienes permiso para registrar diagnósticos',
      duration: 2500,
      color: 'warning',
      position: 'bottom',
    });
    await toast.present();
    return;
  }

  this.citaSeleccionada = cita;
  const diag = await this.diagnosticoSvc.getOnce(cita.idCita);
  this.existeDiagnostico = !!diag;

  const soloLectura = cita.estado === 'finalizada';
  await this.abrirDiagnosticoModal(soloLectura);
}

async abrirDiagnosticoModal(soloLectura: boolean) {
  if (!this.citaSeleccionada) return;

  const idCita = this.citaSeleccionada.idCita;

  if (!soloLectura && this.citaSeleccionada.estado === 'pendiente') {
    await this.citaService.cambiarEstado(idCita, 'en_proceso');
    this.citaSeleccionada = { ...this.citaSeleccionada, estado: 'en_proceso' };
  }

  const modal = await this.modalCtrl.create({
    component: DiagnosticoModalComponent,
    componentProps: {
      cita:              this.citaSeleccionada,
      nombreVeterinario: `${this.vetNombre} ${this.vetApellido}`,
      soloLectura,
    },
    breakpoints:       [0, 1],
    initialBreakpoint: 1,
    backdropDismiss:   false,
    cssClass:          'modal-diagnostico-desktop',
  });

  await modal.present();
  const { data } = await modal.onWillDismiss();

  if (!soloLectura) {
    const nuevoEstado = data?.guardado ? 'finalizada' : 'pendiente'; // ← vuelve a pendiente si cancela
    await this.citaService.cambiarEstado(idCita, nuevoEstado);
    this.citaSeleccionada = { ...this.citaSeleccionada, estado: nuevoEstado };
    if (data?.guardado) this.existeDiagnostico = true;

    const msg = data?.guardado ? 'Diagnóstico guardado correctamente' : 'Diagnóstico cancelado';
    const color = data?.guardado ? 'success' : 'warning';
    const toast = await this.toastCtrl.create({ message: msg, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}

  // ── Handler: clic en slot vacío ─────────────────────────────────
  // El veterinario NO puede crear citas (no tiene ese privilegio)
  onSlotClick(_slot: { dateStr: string; hora: string }) {
    // Sin acción: solo el administrador/recepcionista pueden crear citas
  }

  // ── Helper: badge de estado ─────────────────────────────────────
  badgeEstado(estado: string): string {
    const map: Record<string,string> = {
      pendiente:   'badge-pendiente',
      confirmada:  'badge-confirmada',
      finalizada:  'badge-finalizada',
      cancelada:   'badge-cancelada',
      no_asistio:  'badge-cancelada',
    };
    return map[estado] ?? 'badge-pendiente';
  }

  textoEstado(estado: string): string {
    const map: Record<string,string> = {
      pendiente:  'Pendiente',
      confirmada: 'Confirmada',
      finalizada: 'Finalizada',
      cancelada:  'Cancelada',
      no_asistio: 'No asistió',
    };
    return map[estado] ?? estado;
  }

  formatHora12(hora: string): string {
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,'0')}${ampm}`;
  }
}
