// calendar-grid.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { Cita } from 'src/app/core/services/cita.service';

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

  readonly DAYS = DAYS;

  readonly TIPOS_LEYENDA = [
    { label: 'Consulta',   value: 'Consulta general', bg: '#E6F1FB', border: '#185FA5' },
    { label: 'Vacunación', value: 'Vacunación',       bg: '#EAF3DE', border: '#3B6D11' },
    { label: 'Cirugía',    value: 'Cirugía',          bg: '#FCEBEB', border: '#A32D2D' },
    { label: 'Urgencia',   value: 'Urgencia',         bg: '#FAEEDA', border: '#854F0B' },
    { label: 'Control',    value: 'Control',          bg: '#EEEDFE', border: '#534AB7' },
    { label: 'Otro',       value: 'Otro',             bg: '#EEEDFE', border: '#534AB7' },
  ];

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

  get todayStr(): string {
    return this.fmtDate(this.today);
  }

  get todasCitas(): Cita[] {
    return this.citas;
  }

  // Se añadió el filtrado completo por mascota sin alterar tu lógica de veterinario
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
      if (!map.has(c.idMascota)) {
        map.set(c.idMascota, { nombre: c.nombreMascota, count: 0 });
      }
      map.get(c.idMascota)!.count++;
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, nombre: v.nombre, count: v.count }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // Setters puros (sin los validadores if(esVeterinario) de tu colega)
  setFiltroVeterinario(id: string) { this.filtroVeterinario = id; }
  setFiltroTipo(tipo: string)      { this.filtroTipo = tipo; }
  setFiltroMascota(id: string)     { this.filtroMascota = id; } // Añadido de tu colega

  limpiarFiltros() {
    this.filtroVeterinario = '';
    this.filtroTipo        = '';
    this.filtroMascota     = '';
  }

  // Añadida la comprobación okMascota
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

  // ── Navegación ─────────────────────────────────────────────────

  shiftWeek(n: number) {
    this.weekStart.setDate(this.weekStart.getDate() + n * 7);
    this.weekStart = new Date(this.weekStart);
    this.renderWeekDays();
  }

  goToday() {
    this.weekStart = this.getWeekStart(this.today);
    this.renderWeekDays();
    this.diaSeleccionado = this.weekDays.find(d => d.isToday) ?? this.weekDays[0];
  }

  jumpToDate(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    this.weekStart = this.getWeekStart(d);
    this.renderWeekDays();
    this.diaSeleccionado = this.weekDays.find(w => w.dateStr === dateStr) ?? this.weekDays[0];
    this.renderMini();
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
        return okFecha && okMascota; // Aplicado el filtro de mascota en la vista de día
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

  // Se mantienen libres sin las condicionales if(!esVeterinario) return;
  openNew(dateStr: string, hora: string) {
    this.slotClick.emit({ dateStr, hora });
  }

  showDetail(cita: Cita) {
    this.citaClick.emit(cita);
  }

  // ── Formato AM/PM ──────────────────────────────────────────────

  formatHoraLabel(hora: string): string {
    const [h, m] = hora.split(':').map(Number);
    if (m !== 0) return ''; // no mostrar label en :30
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

  // Utilidad extraída de tu colega
  getNombreMascota(id: string): string {
    return this.mascotasUnicas.find(m => m.id === id)?.nombre ?? '';
  }
}
