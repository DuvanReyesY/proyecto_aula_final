// calendar-grid.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, inject } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { Cita } from 'src/app/core/services/cita.service';
import { CitasSlotPopoverComponent } from '../citas-slot-popover/citas-slot-popover.component';
import { HorarioService, Turno, DOW_MAP } from 'src/app/core/services/horario.service';

export interface DiaCalendario {
  dateStr: string;
  dow:     string;
  num:     number;
  isToday: boolean;
}

export interface MiniDay {
  dateStr:    string;
  num:        number;
  isToday:    boolean;
  isSelected: boolean;
  otherMonth: boolean;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const VET_COLORS = ['#185FA5','#3B6D11','#A32D2D','#854F0B','#534AB7','#0C6B6B','#8B2F8B','#1A6B6B'];

@Component({
  selector: 'app-calendar-grid',
  templateUrl: './calendar-grid.component.html',
  styleUrls: ['./calendar-grid.component.scss'],
  standalone: false,
})
export class CalendarGridComponent implements OnInit, OnChanges {

  @Input() citas:        Cita[] = [];
  @Input() veterinarios: any[]  = [];
  @Input() mostrarFiltroVet: boolean = true;

  @Output() citaClick = new EventEmitter<Cita>();
  @Output() slotClick = new EventEmitter<{ dateStr: string; hora: string }>();

  private horarioService = inject(HorarioService);

  filtroVeterinario = '';
  filtroTipo        = '';
  filtroMascota     = '';

  weekStart!:       Date;
  today:            Date = new Date();
  miniBase!:        Date;
  weekDays:         DiaCalendario[] = [];
  miniDays:         MiniDay[]       = [];
  miniMonthLabel    = '';
  weekLabel         = '';
  horasGrid:        string[]        = [];
  vistaActual:      'semana' | 'dia' = 'semana';
  diaSeleccionado!: DiaCalendario;

  // ── Horarios ───────────────────────────────────────────────────
  // Key: dateStr → Set de horas habilitadas para el vet filtrado
  slotsHabilitados: Map<string, Set<string>> = new Map();
  cargandoHorarios = false;

  readonly DAYS = DAYS;

  readonly TIPOS_LEYENDA = [
    { label: 'Consulta',   value: 'Consulta general', bg: '#E6F1FB', border: '#185FA5' },
    { label: 'Vacunación', value: 'Vacunación',       bg: '#EAF3DE', border: '#3B6D11' },
    { label: 'Cirugía',    value: 'Cirugía',          bg: '#FCEBEB', border: '#A32D2D' },
    { label: 'Urgencia',   value: 'Urgencia',         bg: '#FAEEDA', border: '#854F0B' },
    { label: 'Control',    value: 'Control',          bg: '#EEEDFE', border: '#534AB7' },
    { label: 'Otro',       value: 'Otro',             bg: '#EEEDFE', border: '#534AB7' },
  ];

  constructor(private popoverCtrl: PopoverController) {}

  ngOnInit() {
    this.weekStart = this.getWeekStart(this.today);
    this.miniBase  = new Date(this.today.getFullYear(), this.today.getMonth(), 1);

    this.horasGrid = [
      '08:00','08:30','09:00','09:30',
      '10:00','10:30','11:00','11:30',
      '12:00','12:30','13:00','13:30',
      '14:00','14:30','15:00','15:30',
      '16:00','16:30','17:00','17:30',
      '18:00',
    ];

    this.renderWeekDays();
    this.renderMini();
    this.diaSeleccionado = this.weekDays.find(d => d.isToday) ?? this.weekDays[0];
  }

  ngOnChanges() {
    if (this.weekDays.length) this.renderMini();
  }

  // ── Popover ────────────────────────────────────────────────────

  async abrirSlotPopover(event: Event, citas: Cita[], dateStr: string, hora: string) {
    event.stopPropagation();

    const popover = await this.popoverCtrl.create({
      component: CitasSlotPopoverComponent,
      componentProps: { citas },
      event,
      translucent: false,
      cssClass: 'citas-slot-popover',
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();

    if (data?.cita)          this.showDetail(data.cita);
    if (data?.action === 'nueva') this.openNew(dateStr, hora);
  }

  // ── Getters ────────────────────────────────────────────────────

  get todayStr(): string { return this.fmtDate(this.today); }
  get todasCitas(): Cita[] { return this.citas; }

  get citasFiltradas(): Cita[] {
    return this.citas.filter(c => {
      const okVet     = !this.filtroVeterinario || c.idVeterinario === this.filtroVeterinario;
      const okTipo    = !this.filtroTipo        || c.tipo === this.filtroTipo;
      const okMascota = !this.filtroMascota     || c.idMascota === this.filtroMascota;
      return okVet && okTipo && okMascota;
    });
  }

  get mascotasUnicas(): { id: string; nombre: string; count: number }[] {
    const map = new Map<string, { nombre: string; count: number }>();
    this.citas.forEach(c => {
      if (!map.has(c.idMascota))
        map.set(c.idMascota, { nombre: c.nombreMascota, count: 0 });
      map.get(c.idMascota)!.count++;
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, nombre: v.nombre, count: v.count }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // ── Filtros ────────────────────────────────────────────────────

  setFiltroVeterinario(id: string) {
    this.filtroVeterinario = id;
    // Recarga los horarios del vet seleccionado para la semana visible
    this.actualizarSlotsHabilitados();
  }

  setFiltroTipo(tipo: string)   { this.filtroTipo = tipo; }
  setFiltroMascota(id: string)  { this.filtroMascota = id; }

  limpiarFiltros() {
    this.filtroVeterinario = '';
    this.filtroTipo        = '';
    this.filtroMascota     = '';
    this.slotsHabilitados.clear();
  }

  isCitaDimmed(cita: Cita): boolean {
    if (!this.filtroVeterinario && !this.filtroTipo && !this.filtroMascota) return false;
    const okVet     = !this.filtroVeterinario || cita.idVeterinario === this.filtroVeterinario;
    const okTipo    = !this.filtroTipo        || cita.tipo === this.filtroTipo;
    const okMascota = !this.filtroMascota     || cita.idMascota === this.filtroMascota;
    return !(okVet && okTipo && okMascota);
  }

  getCitasPorVet(idVet: string): Cita[]  { return this.citas.filter(c => c.idVeterinario === idVet); }
  getCitasPorTipo(tipo: string): Cita[]  { return this.citas.filter(c => c.tipo === tipo); }

  getCbSize(horaInicio: string, horaFin: string): string {
    const h = this.calcHeight(horaInicio, horaFin);
    if (h < 30) return 'cb-xs';
    if (h < 54) return 'cb-sm';
    if (h < 80) return 'cb-md';
    return '';
  }

  // ── Horarios integrados ────────────────────────────────────────

  /**
   * Carga desde Firestore los turnos del vet filtrado
   * para cada día de la semana visible y los convierte en
   * un Map<dateStr, Set<hora>> para consulta O(1) en el template.
   */
  async actualizarSlotsHabilitados() {
    if (!this.filtroVeterinario) {
      this.slotsHabilitados.clear();
      return;
    }

    this.cargandoHorarios = true;
    this.slotsHabilitados = new Map();

    try {
      // Carga todos los horarios del vet una sola vez (7 docs máx)
      const horarios = await this.horarioService.getHorariosOnce(this.filtroVeterinario);
      const horarioMap = new Map(horarios.map(h => [h.dia, h]));

      for (const dia of this.weekDays) {
        const date   = new Date(dia.dateStr + 'T12:00:00');
        const diaNom = DOW_MAP[date.getDay()];
        const horarioDia = horarioMap.get(diaNom);

        if (!horarioDia || !horarioDia.activo) {
          // Día no laboral: Set vacío → todos los slots bloqueados
          this.slotsHabilitados.set(dia.dateStr, new Set());
        } else {
          const slots = this.horarioService.getSlotsFromTurnos(horarioDia.turnos);
          this.slotsHabilitados.set(dia.dateStr, new Set(slots));
        }
      }
    } finally {
      this.cargandoHorarios = false;
    }
  }

  /**
   * Retorna el estado visual del slot para el template.
   * - 'libre'    → dentro del horario, sin cita → fondo normal, clickeable
   * - 'ocupado'  → tiene al menos una cita activa → ya renderizado por la cita
   * - 'bloqueado'→ fuera del horario del vet → fondo rayado, no clickeable
   * - 'sin-filtro' → no hay vet seleccionado → comportamiento original
   */
  getEstadoSlot(dateStr: string, hora: string): 'libre' | 'ocupado' | 'bloqueado' | 'sin-filtro' {
    // Sin filtro de vet → comportamiento original del calendario
    if (!this.filtroVeterinario) return 'sin-filtro';

    const slots = this.slotsHabilitados.get(dateStr);

    // Aún cargando o no hay datos para este día
    if (!slots) return 'sin-filtro';

    // Fuera del horario del vet
    if (!slots.has(hora)) return 'bloqueado';

    // Dentro del horario → verificar si hay cita activa
    const tieneCita = this.citas.some(c =>
      c.idVeterinario === this.filtroVeterinario &&
      c.fecha         === dateStr &&
      c.horaInicio    === hora &&
      !['cancelada', 'no_asistio'].includes(c.estado)
    );

    return tieneCita ? 'ocupado' : 'libre';
  }

  /** Clase CSS según el estado del slot — úsala en el template */
  getClaseSlot(dateStr: string, hora: string): string {
    const estado = this.getEstadoSlot(dateStr, hora);
    return `slot-${estado}`;
  }

  /** true → el slot es clickeable (libre o sin filtro) */
  slotEsClickeable(dateStr: string, hora: string): boolean {
    const estado = this.getEstadoSlot(dateStr, hora);
    return estado === 'libre' || estado === 'sin-filtro';
  }

  // ── Navegación ─────────────────────────────────────────────────

  shiftWeek(n: number) {
    this.weekStart.setDate(this.weekStart.getDate() + n * 7);
    this.weekStart = new Date(this.weekStart);
    this.renderWeekDays();
    // Recarga los horarios para la nueva semana si hay vet filtrado
    if (this.filtroVeterinario) this.actualizarSlotsHabilitados();
  }

  goToday() {
    this.weekStart = this.getWeekStart(this.today);
    this.renderWeekDays();
    this.diaSeleccionado = this.weekDays.find(d => d.isToday) ?? this.weekDays[0];
    if (this.filtroVeterinario) this.actualizarSlotsHabilitados();
  }

  jumpToDate(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    this.weekStart = this.getWeekStart(d);
    this.renderWeekDays();
    this.diaSeleccionado = this.weekDays.find(w => w.dateStr === dateStr) ?? this.weekDays[0];
    this.renderMini();
    if (this.filtroVeterinario) this.actualizarSlotsHabilitados();
  }

  shiftMini(n: number) {
    this.miniBase.setMonth(this.miniBase.getMonth() + n);
    this.miniBase = new Date(this.miniBase);
    this.renderMini();
  }

  // ── Render ─────────────────────────────────────────────────────

  renderWeekDays() {
    const todayStr = this.fmtDate(this.today);
    this.weekDays  = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      return {
        dateStr: this.fmtDate(d),
        dow:     DAYS[d.getDay()],
        num:     d.getDate(),
        isToday: this.fmtDate(d) === todayStr,
      };
    });
    const end = new Date(this.weekStart);
    end.setDate(end.getDate() + 6);
    const sm = MONTHS[this.weekStart.getMonth()];
    const em = MONTHS[end.getMonth()];
    this.weekLabel = sm === em
      ? `${sm} ${this.weekStart.getDate()}–${end.getDate()}, ${this.weekStart.getFullYear()}`
      : `${sm} ${this.weekStart.getDate()} – ${em} ${end.getDate()}, ${this.weekStart.getFullYear()}`;
  }

  renderMini() {
    this.miniMonthLabel = `${MONTHS[this.miniBase.getMonth()]} ${this.miniBase.getFullYear()}`;
    const todayStr = this.fmtDate(this.today);
    const first    = new Date(this.miniBase.getFullYear(), this.miniBase.getMonth(), 1);
    const start    = new Date(first);
    start.setDate(start.getDate() - first.getDay());

    this.miniDays = Array.from({ length: 42 }, (_, i) => {
      const d  = new Date(start);
      d.setDate(start.getDate() + i);
      const ds = this.fmtDate(d);
      return {
        dateStr:    ds,
        num:        d.getDate(),
        isToday:    ds === todayStr,
        isSelected: this.weekDays.some(w => w.dateStr === ds),
        otherMonth: d.getMonth() !== this.miniBase.getMonth(),
      };
    });
  }

  // ── Citas ──────────────────────────────────────────────────────

  getCitasDelDia(dateStr: string): Cita[] {
    return this.citas
      .filter(c => {
        const okFecha   = c.fecha === dateStr;
        const okMascota = !this.filtroMascota || c.idMascota === this.filtroMascota;
        return okFecha && okMascota;
      })
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  esProximaCita(cita: Cita): boolean {
    if (cita.fecha !== this.todayStr) return false;
    if (['finalizada', 'cancelada', 'no_asistio'].includes(cita.estado)) return false;

    const ahora     = new Date();
    const horaAhora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;

    const proxima = this.getCitasDelDia(this.todayStr)
      .find(c =>
        !['finalizada', 'cancelada', 'no_asistio'].includes(c.estado) &&
        c.horaInicio >= horaAhora
      );

    return !!proxima && proxima.idCita === cita.idCita;
  }

  // ── Posicionamiento ────────────────────────────────────────────

  calcTop(horaInicio: string): number {
    const [h, m] = horaInicio.split(':').map(Number);
    return ((h - 8) * 60 + m) / 30 * 48;
  }

  calcHeight(horaInicio: string, horaFin: string): number {
    const [sh, sm] = horaInicio.split(':').map(Number);
    const [eh, em] = horaFin.split(':').map(Number);
    const diff = ((eh - 8) * 60 + em) - ((sh - 8) * 60 + sm);
    return Math.max((diff / 30) * 48 - 2, 22);
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

  getVetColor(vet: any): string {
    const idx = this.veterinarios.indexOf(vet);
    return VET_COLORS[idx % VET_COLORS.length];
  }

  getVetColorById(id: string): string {
    const idx = this.veterinarios.findIndex(v => (v.uid ?? v.idVeterinario) === id);
    return idx >= 0 ? VET_COLORS[idx % VET_COLORS.length] : '#888';
  }

  getVetColorByCita(cita: Cita): string {
    return this.getVetColorById(cita.idVeterinario);
  }

  getNombreVetById(id: string): string {
    const v = this.veterinarios.find(v => (v.uid ?? v.idVeterinario) === id);
    if (!v) return '';
    return `${v.Nombre ?? ''} ${v.Apellido ?? ''}`.trim();
  }

  openNew(dateStr: string, hora: string) {
    this.slotClick.emit({ dateStr, hora });
  }

  showDetail(cita: Cita) {
    this.citaClick.emit(cita);
  }

  // ── Formato AM/PM ──────────────────────────────────────────────

  formatHoraLabel(hora: string): string {
    const [h, m] = hora.split(':').map(Number);
    if (m !== 0) return '';
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${ampm}`;
  }

  formatHora12Short(hora: string): string {
    const [h, m] = hora.split(':').map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2,'0')}`;
  }

  getAmPm(hora: string): string {
    const [h] = hora.split(':').map(Number);
    return h >= 12 ? 'pm' : 'am';
  }

  private getWeekStart(d: Date): Date {
    const dt = new Date(d);
    dt.setDate(dt.getDate() - dt.getDay());
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  private fmtDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  getNombreMascota(id: string): string {
    return this.mascotasUnicas.find(m => m.id === id)?.nombre ?? '';
  }

  getCitasAgrupadasPorHora(dateStr: string): Map<string, Cita[]> {
    const map = new Map<string, Cita[]>();
    this.getCitasDelDia(dateStr).forEach(cita => {
      const key = cita.horaInicio;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cita);
    });
    return map;
  }

  getHorasUnicasDelDia(dateStr: string): string[] {
    return Array.from(this.getCitasAgrupadasPorHora(dateStr).keys());
  }

  getCitasEnSlot(dateStr: string, hora: string): Cita[] {
    return this.getCitasAgrupadasPorHora(dateStr).get(hora) ?? [];
  }
}