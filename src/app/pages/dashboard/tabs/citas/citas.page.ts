// citas.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { inject } from '@angular/core';
import { Subscription, take } from 'rxjs';

import { CitaService, Cita } from 'src/app/core/services/cita.service';
import { UserService } from 'src/app/core/services/user.service';
import { MascotaService, Mascota } from 'src/app/core/services/mascota.service';
import { ModalController } from '@ionic/angular';
import { ReasignarVeterinarioComponent } from 'src/app/shared/components/reasignar-veterinario/reasignar-veterinario.component';
import { DiagnosticoModalComponent } from 'src/app/shared/components/diagnostico-modal/diagnostico-modal.component';
import { DiagnosticoService } from 'src/app/core/services/diagnostico.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { HorarioService, DOW_MAP } from 'src/app/core/services/horario.service';

@Component({
  selector: 'app-cita',
  selector: 'app-cita',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: false,
  standalone: false,
})
export class CitaPage implements OnInit, OnDestroy {

  todasCitas:   Cita[]  = [];
  veterinarios: any[]   = [];

  modo: 'crear' | 'editar' = 'crear';
  idCita         = '';
  idCliente      = '';
  idMascota      = '';
  idVeterinario  = '';
  fecha          = '';
  horaInicio     = '';
  horaFin        = '';
  horasSeleccionadas: string[] = [];
  tipo           = '';
  estado: Cita['estado'] = 'pendiente';
  notas          = '';
  formularioEsValido = false;
  modalTitulo    = 'Nueva cita';

  modalNuevaOpen   = false;
  modalDetalleOpen = false;
  citaDetalle:     Cita | null = null;

  clientes:  any[]     = [];
  mascotas:  Mascota[] = [];
  slotsHora: string[]  = [];

  uidActual            = '';
  rolActual            = '';
  nombreRecepcionista  = '';

  mostrarReasignacion = false;
  idVeterinarioNuevo  = '';
  motivoReasignacion  = '';
  slotsHabilitadosVet: Set<string> = new Set();
  readonly TIPOS_LISTA = [
    { value: 'Consulta general', label: 'Consulta',   clase: 'consulta' },
    { value: 'Vacunación',       label: 'Vacunación', clase: 'vacuna'   },
    { value: 'Cirugía',          label: 'Cirugía',    clase: 'cirugia'  },
    { value: 'Urgencia',         label: 'Urgencia',   clase: 'urgencia' },
    { value: 'Control',          label: 'Control',    clase: 'control'  },
    { value: 'Otro',             label: 'Otro',       clase: 'control'  },
  ];

  private subs: Subscription[] = [];
  private auth = inject(Auth);
  private horarioSvc = inject(HorarioService);

  constructor(
    private route:       ActivatedRoute,
    private router:      Router,
    private citaSvc:     CitaService,
    private userSvc:     UserService,
    private mascotaSvc:  MascotaService,
    private toastCtrl:   ToastController,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController,
    private diagnosticoSvc: DiagnosticoService,
    public authService: AuthService,
    private alertCtrl:   AlertController,
    
    
  ) {}
  // ── Diagnóstico ──────────────────────────────────────────────
  existeDiagnostico: boolean = false;


  async ngOnInit() {
    this.generarSlots();
    await this.inicializarSesion();
    await this.cargarListas();
    this.cargarCitasEnCalendario();
    this.subs.push(
      this.route.queryParams.subscribe(async params => {
        if (params['modo'] === 'editar' && params['id']) {
          this.modo   = 'editar';
          this.idCita = params['id'];
          await this.cargarCitaEnFormulario(this.idCita);
          this.modalNuevaOpen = true;
        }
      })
    );
  }


  async showDetail(cita: Cita) {
    this.citaDetalle      = cita;
    this.modalDetalleOpen = true;
    // Consultar si existe diagnóstico
    if (cita && cita.idCita) {
      const diag = await this.diagnosticoSvc.getOnce(cita.idCita);
      this.existeDiagnostico = !!diag;
    } else {
      this.existeDiagnostico = false;
    }
  }

  esVeterinarioAsignado(): boolean {
    if (!this.citaDetalle) return false;
    return this.rolActual === 'veterinario' && this.citaDetalle.idVeterinario === this.uidActual;
  }

  async abrirDiagnosticoModal(soloLectura: boolean) {
    if (!this.citaDetalle) return;

    const idCita = this.citaDetalle.idCita;

    // Al abrir: pendiente → en_proceso
    if (!soloLectura) {
      await this.citaSvc.cambiarEstado(idCita, 'en_proceso');
      this.citaDetalle = { ...this.citaDetalle, estado: 'en_proceso' };
    }

    const modal = await this.modalCtrl.create({
      component: DiagnosticoModalComponent,
      componentProps: {
        cita:              this.citaDetalle,
        nombreVeterinario: this.nombreRecepcionista,
        soloLectura,
      },
      breakpoints:       [0, 1],
      initialBreakpoint: 1,
      backdropDismiss:   false,
      cssClass: 'modal-diagnostico-desktop'
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (!soloLectura) {
      if (data?.guardado) {
        // Guardó diagnóstico → finalizada
        await this.citaSvc.cambiarEstado(idCita, 'finalizada');
        this.citaDetalle = { ...this.citaDetalle, estado: 'finalizada' };
        this.existeDiagnostico = true;
      } else {
        // Canceló sin guardar → cancelada
        await this.citaSvc.cambiarEstado(idCita, 'cancelada');
        this.citaDetalle = { ...this.citaDetalle, estado: 'cancelada' };
      }
      // Reflejar en el calendario
      this.todasCitas = this.todasCitas.map(c =>
        c.idCita === idCita ? { ...c, estado: this.citaDetalle!.estado } : c
      );
    } else {
      const diag = await this.diagnosticoSvc.getOnce(idCita);
      this.existeDiagnostico = !!diag;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────


  // (Eliminada implementación duplicada de ngOnInit)

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Citas ─────────────────────────────────────────────────────

private yaRevisó = false;

private cargarCitasEnCalendario() {
  // El veterinario solo ve sus propias citas; los demás roles ven todas
  const obs$ = this.rolActual === 'veterinario'
    ? this.citaSvc.getPorVeterinario(this.uidActual)
    : this.citaSvc.getTodas();

  this.subs.push(
    obs$.subscribe(citas => {
      // Spread para crear nueva referencia — Angular detecta el cambio en el @Input del hijo
      this.todasCitas = [...citas];
      if (!this.yaRevisó) {
        this.yaRevisó = true;
        this.citaSvc.revisarVencidas();
      }
    })
  );
}


  onCitaClick(cita: Cita) { this.showDetail(cita); }
  onSlotClick(event: { dateStr: string; hora: string }) { this.openNew(event.dateStr, event.hora); }

  // ── Abrir modal nueva cita ────────────────────────────────────

  openNew(dateStr?: string, hora?: string) {
    this.modo               = 'crear';
    this.idCita             = '';
    this.idCliente          = '';
    this.idMascota          = '';
    this.idVeterinario      = '';
    this.fecha              = dateStr ?? this.hoy;
    this.horaInicio         = '';
    this.horaFin            = '';
    this.horasSeleccionadas = [];
    this.tipo               = '';
    this.estado             = 'pendiente';
    this.notas              = '';
    this.mascotas           = [];
    this.formularioEsValido = false;
    this.modalTitulo        = hora ? `Nueva cita · ${hora}` : 'Nueva cita';

    if (hora && this.slotsHora.includes(hora)) this.toggleSlot(hora);
    this.modalNuevaOpen = true;
  }

  closeModal() {
    this.modalNuevaOpen     = false;
    this.horasSeleccionadas = [];
  }


  // ── Detalle ───────────────────────────────────────────────────
  // showDetail fusionado arriba

  closeDetail() {
    this.modalDetalleOpen = false;
    this.citaDetalle      = null;
  }

  async editFromDetail() {
    if (!this.citaDetalle) return;

    const { editable, motivo } = this.citaEsEditable(this.citaDetalle);

    if (!editable) {
      await this.mostrarToast(motivo, 'warning');
      return;
    }

    const cita = { ...this.citaDetalle };
    this.closeDetail();
    this.cargarEnFormulario(cita);
    this.modalNuevaOpen = true;
  }

  // ── Formulario ────────────────────────────────────────────────

generarSlots() {
  const slots: string[] = [];

  // 8:00 AM – 12:00 PM
  for (let h = 8; h < 13; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }

  // 1:00 PM – 6:00 PM
  for (let h = 13; h <= 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 18) slots.push(`${String(h).padStart(2, '0')}:30`);
  }

  this.slotsHora = slots;
}

  private toMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private sumarMinutos(hora: string, mins: number): string {
    const total = this.toMinutos(hora) + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  toggleSlot(slot: string) {
    if (this.isSlotOcupado(slot)) return;

    const idx    = this.slotsHora.indexOf(slot);
    const selIdx = this.horasSeleccionadas
      .map(s => this.slotsHora.indexOf(s))
      .sort((a, b) => a - b);

    if (this.horasSeleccionadas.includes(slot)) {
      if (selIdx.length === 1) {
        this.horasSeleccionadas = [];
      } else if (idx === selIdx[0]) {
        this.horasSeleccionadas = selIdx.slice(1).map(i => this.slotsHora[i]);
      } else if (idx === selIdx[selIdx.length - 1]) {
        this.horasSeleccionadas = selIdx.slice(0, -1).map(i => this.slotsHora[i]);
      } else {
        this.horasSeleccionadas = [slot];
      }
    } else {
      if (selIdx.length === 0) {
        this.horasSeleccionadas = [slot];
      } else {
        const min = selIdx[0];
        const max = selIdx[selIdx.length - 1];
        if (idx === min - 1)      this.horasSeleccionadas = [slot, ...this.horasSeleccionadas];
        else if (idx === max + 1) this.horasSeleccionadas = [...this.horasSeleccionadas, slot];
        else                      this.horasSeleccionadas = [slot];
      }
    }

    if (this.horasSeleccionadas.length === 0) {
      this.horaInicio = '';
      this.horaFin    = '';
    } else {
      const sorted = this.horasSeleccionadas
        .map(s => this.slotsHora.indexOf(s))
        .sort((a, b) => a - b)
        .map(i => this.slotsHora[i]);
      this.horaInicio = sorted[0];
      this.horaFin    = this.sumarMinutos(sorted[sorted.length - 1], 30);
    }

    this.validarFormulario();
  }

isSlotOcupado(slot: string): boolean {
  // Si hay horario cargado y el slot no está en él → bloqueado
  if (this.slotsHabilitadosVet.size > 0 && !this.slotsHabilitadosVet.has(slot)) {
    return true;
  }

  if (!this.idVeterinario || !this.fecha) return false;
  if (this.modo === 'crear' && this.esFechaPasada) return true;

  const slotMin    = this.toMinutos(slot);
  const slotFinMin = slotMin + 30;

  return this.todasCitas.some(c => {
    if (c.idCita === this.idCita)               return false;
    if (c.idVeterinario !== this.idVeterinario) return false;
    if (c.fecha !== this.fecha)                 return false;

    if (c.estado === 'cancelada' || c.estado === 'no_asistio') {
      const ahora     = new Date();
      const fechaHoy  = this.hoy;
      const horaAhora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
      const esProxima = c.fecha > fechaHoy || (c.fecha === fechaHoy && c.horaInicio > horaAhora);
      if (esProxima) return false;
    }

    const cStart = this.toMinutos(c.horaInicio);
    const cEnd   = this.toMinutos(c.horaFin);
    return slotMin < cEnd && slotFinMin > cStart;
  });
}

  validarFormulario() {
    this.formularioEsValido = !!(
      this.idCliente && this.idMascota && this.idVeterinario &&
      this.fecha && !this.esFechaPasada &&
      this.horaInicio && this.tipo
    );
  }

private async cargarSlotsDelVet() {
  if (!this.idVeterinario || !this.fecha) {
    this.slotsHabilitadosVet = new Set();
    return;
  }

  try {
    const horarios   = await this.horarioSvc.getHorariosOnce(this.idVeterinario);
    const date       = new Date(this.fecha + 'T12:00:00');
    const diaNom     = DOW_MAP[date.getDay()];
    const horarioDia = horarios.find(h => h.dia === diaNom);

    if (!horarioDia || !horarioDia.activo || horarioDia.turnos.length === 0) {
      this.slotsHabilitadosVet = new Set();
    } else {
      const slots = this.horarioSvc.getSlotsFromTurnos(horarioDia.turnos);
      this.slotsHabilitadosVet = new Set(slots);
    }
  } catch {
    this.slotsHabilitadosVet = new Set();
  }

  // Quitar slots seleccionados que ya no están habilitados
  this.horasSeleccionadas = this.horasSeleccionadas.filter(s =>
    this.slotsHabilitadosVet.size === 0 || this.slotsHabilitadosVet.has(s)
  );
  if (this.horasSeleccionadas.length > 0) {
    const sorted    = this.horasSeleccionadas
      .map(s => this.slotsHora.indexOf(s)).sort((a,b) => a-b)
      .map(i => this.slotsHora[i]);
    this.horaInicio = sorted[0];
    this.horaFin    = this.sumarMinutos(sorted[sorted.length - 1], 30);
  } else {
    this.horaInicio = '';
    this.horaFin    = '';
  }
  this.validarFormulario();
}

// Reemplaza el onVeterinarioChange existente:
onVeterinarioChange() {
  this.cargarSlotsDelVet();
}

// Reemplaza el onFechaChange existente:
onFechaChange() {
  this.cargarSlotsDelVet();
}


  async onClienteChange() {
    this.idMascota = '';
    this.mascotas  = [];
    if (!this.idCliente) return;
    this.subs.push(
      this.mascotaSvc.getMascotasPorCliente(this.idCliente)
        .subscribe(mascotas => {
          this.mascotas = mascotas.filter(m => m.estado === 'activo');
        })
    );
  }

  // ── Cargar cita en formulario (EDITAR) ────────────────────────

  private cargarEnFormulario(cita: Cita) {
    this.modo          = 'editar';
    this.idCita        = cita.idCita;
    this.idCliente     = cita.idCliente;
    this.idVeterinario = cita.idVeterinario;
    this.fecha         = cita.fecha;
    this.horaInicio    = cita.horaInicio;
    this.horaFin       = cita.horaFin;
    this.tipo          = cita.tipo;
    this.estado        = cita.estado;
    this.notas         = cita.notas;
    this.modalTitulo   = 'Editar cita';

    this.horasSeleccionadas = this.slotsHora.filter(slot => {
      const s  = this.toMinutos(slot);
      const fi = s + 30;
      const ci = this.toMinutos(cita.horaInicio);
      const cf = this.toMinutos(cita.horaFin);
      return s >= ci && fi <= cf;
    });

    // ✅ take(1) evita acumulación de suscripciones
    this.mascotaSvc.getMascotasPorCliente(this.idCliente)
      .pipe(take(1))
      .subscribe(mascotas => {
        this.mascotas  = mascotas.filter(m => m.estado === 'activo');
        this.idMascota = cita.idMascota;
        this.validarFormulario(); // ✅ Se llama cuando idMascota ya está asignado
      });
  }

  private async cargarCitaEnFormulario(idCita: string) {
    this.subs.push(
      this.citaSvc.getTodas().subscribe(citas => {
        const cita = citas.find(c => c.idCita === idCita);
        if (cita) this.cargarEnFormulario(cita);
      })
    );
  }

  // ── Sesión ────────────────────────────────────────────────────

  private inicializarSesion(): Promise<void> {
    return new Promise(resolve => {
      const unsub = onAuthStateChanged(this.auth, async user => {
        unsub(); // solo necesitamos el primer emit
        if (!user) { resolve(); return; }
        this.uidActual = user.uid;
        const roles  = ['administradores', 'recepcionistas', 'veterinarios', 'clientes'];
        const rolMap: Record<string, string> = {
          administradores: 'administrador',
          recepcionistas:  'recepcionista',
          veterinarios:    'veterinario',
          clientes:        'cliente',
        };
        for (const col of roles) {
          const data = await this.userSvc.getDocumentOnce(col, user.uid);
          if (data) {
            this.rolActual           = rolMap[col];
            this.nombreRecepcionista = `${data.Nombre ?? ''} ${data.Apellido ?? ''}`.trim();
            break;
          }
        }
        resolve();
      });
    });
  }

  // ── Carga de listas ───────────────────────────────────────────

  private async cargarListas() {
    this.subs.push(
      this.userSvc.getTodosLosUsuarios().subscribe(users => {
        this.clientes = users.filter(u =>
          (u.rol === 'cliente' || u.coleccion === 'clientes') && u.estado === 'activo'
        );
        this.veterinarios = users.filter(u =>
          (u.rol === 'veterinario' || u.coleccion === 'veterinarios') && u.estado === 'activo'
        );
      })
    );
  }

  // ── Helpers de nombre ─────────────────────────────────────────

  private getNombreCliente(): string {
    const c = this.clientes.find(x => x.idCliente === this.idCliente || x.uid === this.idCliente);
    if (!c) return '';
    return `${c.Nombre ?? c.nombre ?? ''} ${c.Apellido ?? c.apellido ?? ''}`.trim();
  }

  private getNombreMascota(): string {
    return this.mascotas.find(x => x.idMascota === this.idMascota)?.nombre ?? '';
  }

  private getNombreVeterinario(): string {
    const v = this.veterinarios.find(x => x.idVeterinario === this.idVeterinario || x.uid === this.idVeterinario);
    if (!v) return '';
    return `${v.Nombre ?? v.nombre ?? ''} ${v.Apellido ?? v.apellido ?? ''}`.trim();
  }

  // ── Guardar ───────────────────────────────────────────────────

  async guardar() {
    if (!this.formularioEsValido) {
      await this.mostrarToast('Completa todos los campos requeridos', 'warning');
      return;
    }
    // Doble barrera: solo aplica en modo crear
    if (this.modo === 'crear' && this.esFechaPasada) {
      await this.mostrarToast('No se pueden registrar citas en fechas pasadas', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.modo === 'crear' ? 'Registrando cita...' : 'Actualizando cita...',
    });
    await loading.present();
    try {
      const payload: Omit<Cita, 'idCita'> = {
        idCliente:           this.idCliente,
        nombreCliente:       this.getNombreCliente(),
        idMascota:           this.idMascota,
        nombreMascota:       this.getNombreMascota(),
        idVeterinario:       this.idVeterinario,
        nombreVeterinario:   this.getNombreVeterinario(),
        idRecepcionista:     this.uidActual,
        nombreRecepcionista: this.nombreRecepcionista,
        fecha:               this.fecha,
        horaInicio:          this.horaInicio,
        horaFin:             this.horaFin,
        tipo:                this.tipo,
        estado:              this.estado,
        notas:               this.notas,
        fechaRegistro:       new Date().toISOString(),
      };
      if (this.modo === 'crear') {
        await this.citaSvc.crearCita(payload);
        await this.mostrarToast('Cita registrada correctamente', 'success');
      } else {
        await this.citaSvc.actualizarCita(this.idCita, payload);
        await this.mostrarToast('Cita actualizada correctamente', 'success');
      }
      this.closeModal();
    } catch (err) {
      console.error(err);
      await this.mostrarToast('Error al guardar la cita', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  cancelar() { this.closeModal(); }

  // ── Reasignación ──────────────────────────────────────────────

  toggleReasignacion() {
    this.mostrarReasignacion = !this.mostrarReasignacion;
    if (!this.mostrarReasignacion) {
      this.idVeterinarioNuevo = '';
      this.motivoReasignacion = '';
    }
  }

  get veterinariosDisponibles(): any[] {
    return this.veterinarios.filter(
      v => (v.idVeterinario ?? v.uid) !== this.idVeterinario
    );
  }

  async confirmarReasignacion() {
    if (!this.idVeterinarioNuevo) {
      await this.mostrarToast('Selecciona un veterinario sustituto', 'warning');
      return;
    }
    const loading = await this.loadingCtrl.create({ message: 'Reasignando veterinario...' });
    await loading.present();
    try {
      const veterinarioAnterior = this.getNombreVeterinario();
      this.idVeterinario = this.idVeterinarioNuevo;
      const nota =
        `[Reasignación ${new Date().toLocaleDateString('es-CO')}] ` +
        `Sustituto de: ${veterinarioAnterior}. ` +
        (this.motivoReasignacion ? `Motivo: ${this.motivoReasignacion}. ` : '') +
        `Nuevo veterinario: ${this.getNombreVeterinario()}.`;
      this.notas = this.notas ? `${this.notas}\n${nota}` : nota;
      if (this.modo === 'editar' && this.idCita) {
        await this.citaSvc.actualizarCita(this.idCita, {
          idVeterinario:     this.idVeterinario,
          nombreVeterinario: this.getNombreVeterinario(),
          notas:             this.notas,
        } as any);
        await this.mostrarToast('Veterinario reasignado correctamente', 'success');
      } else {
        await this.mostrarToast('Veterinario cambiado. Guarda la cita para confirmar.', 'success');
      }
      this.mostrarReasignacion = false;
      this.idVeterinarioNuevo  = '';
      this.motivoReasignacion  = '';
    } catch (err) {
      console.error(err);
      await this.mostrarToast('Error al reasignar veterinario', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // ── Toast ─────────────────────────────────────────────────────

  private async mostrarToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      buttons: [{ icon: 'close-outline', role: 'cancel' }],
    });
    await toast.present();
  }

  // ── Utils ─────────────────────────────────────────────────────

  getBadgeColor(estado: string): string {
    const map: Record<string, string> = {
      pendiente:  'warning',
      en_proceso: 'primary',
      finalizada: 'medium',
      cancelada:  'danger',
      no_asistio: 'dark',
    };
    return map[estado] ?? 'medium';
  }

  // En modo editar se permite la fecha original aunque sea pasada
  get esFechaPasada(): boolean {
    if (!this.fecha) return false;
    if (this.modo === 'editar') return false;
    return this.fecha < this.hoy;
  }

  get hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  getClaseTipo(tipo: string): string {
    const map: Record<string, string> = {
      'Consulta general': 'cita-consulta',
      'Vacunación':       'cita-vacuna',
      'Cirugía':          'cita-cirugia',
      'Urgencia':         'cita-urgencia',
      'Control':          'cita-control',
      'Otro':             'cita-control',
    };
    return map[tipo] ?? 'cita-control';
  }

citaEsEditable(cita: Cita): { editable: boolean; motivo: string } {
  const estadosNoEditables: Record<string, string> = {
    finalizada: 'Esta cita ya fue finalizada',
    cancelada:  'Esta cita fue cancelada',
    no_asistio: 'El cliente no asistió a esta cita',
  };

  if (estadosNoEditables[cita.estado]) {
    console.log('BLOQUEADA POR ESTADO:', cita.estado);
    return { editable: false, motivo: estadosNoEditables[cita.estado] };
  }

  const ahora    = new Date();
  const fechaHoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
  const horaAhora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;

  console.log('fechaCita:', cita.fecha, '| fechaHoy:', fechaHoy, '| horaFin:', cita.horaFin, '| horaAhora:', horaAhora);
  console.log('esPasada:', cita.fecha < fechaHoy);

  if (cita.fecha < fechaHoy) {
    return { editable: false, motivo: 'Esta cita pertenece a una fecha pasada' };
  }

  if (cita.fecha === fechaHoy && cita.horaFin <= horaAhora) {
    console.log('BLOQUEADA POR HORA');
    return { editable: false, motivo: 'El horario de esta cita ya pasó' };
  }

  console.log('EDITABLE ✅');
  return { editable: true, motivo: '' };
}

  formatHora12Slot(hora: string): string {
  if (!hora) return '';
  const [h, m] = hora.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${h12} ${ampm}`
    : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

get puedeEditar(): boolean {
  if (!this.citaDetalle) return false;
  return this.citaEsEditable(this.citaDetalle).editable;
}

async abrirReasignacion() {
  if (!this.citaDetalle) return;

  const modal = await this.modalCtrl.create({
    component: ReasignarVeterinarioComponent,
    componentProps: {
      cita: this.citaDetalle,
      nombreVeterinarioActual: this.citaDetalle.nombreVeterinario,
    },
    breakpoints: [1],
    initialBreakpoint: 1,
  });

  await modal.present();

  const { data } = await modal.onWillDismiss();
  if (data?.reasignado) this.closeDetail();
}

async cancelarCita() {
  if (!this.citaDetalle || this.citaDetalle.estado !== 'pendiente') return;

  const alert = await this.alertCtrl.create({
    header:  'Cancelar cita',
    message: `¿Confirmas la cancelación de la cita de ${this.citaDetalle.nombreMascota}?`,
    buttons: [
      { text: 'No', role: 'cancel' },
      {
        text: 'Sí, cancelar',
        handler: async () => {
          try {
            await this.citaSvc.cambiarEstado(this.citaDetalle!.idCita, 'cancelada');
            this.citaDetalle = { ...this.citaDetalle!, estado: 'cancelada' };
            this.todasCitas = this.todasCitas.map(c =>
              c.idCita === this.citaDetalle!.idCita ? { ...c, estado: 'cancelada' } : c
            );
            await this.mostrarToast('Cita cancelada', 'success');
            this.closeDetail();
          } catch {
            await this.mostrarToast('Error al cancelar la cita', 'danger');
          }
        },
      },
    ],
  });
  await alert.present();
}
}