import { Component, OnInit, inject, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController, LoadingController, ModalController } from '@ionic/angular';
import {
  HorarioService, HorarioDia, DiaSemana,
  DIAS_SEMANA, TURNOS_PRESET, Turno
} from 'src/app/core/services/horario.service';
import { UserService } from 'src/app/core/services/user.service';

interface TurnoUI extends Turno {
  preset: 'manana' | 'tarde' | 'custom' | null;
}

interface HorarioDiaUI {
  dia:               DiaSemana;
  label:             string;
  activo:            boolean;
  turnos:            TurnoUI[];
  slotsSeleccionados: string[];
}

const LABELS: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

// 8:00–12:00 y 13:00–18:00 cada 30 min (igual que citas)
const HORAS_DISPONIBLES: string[] = (() => {
  const h: string[] = [];
  for (let i = 8 * 60; i < 12 * 60; i += 30)
    h.push(`${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}`);
  h.push('12:00');
  for (let i = 13 * 60; i <= 18 * 60; i += 30)
    h.push(`${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}`);
  return h;
})();

@Component({
  selector: 'app-horario-veterinario',
  templateUrl: './horario-veterinario.component.html',
  styleUrls: ['./horario-veterinario.component.scss'],
  standalone: false,
})
export class HorarioVeterinarioComponent implements OnInit {

  @Input() uid = '';

  private route          = inject(ActivatedRoute);
  private horarioService = inject(HorarioService);
  private userService    = inject(UserService);
  private toastCtrl      = inject(ToastController);
  private loadingCtrl    = inject(LoadingController);
  private modalCtrl      = inject(ModalController);

  nombreVet        = '';
  dias: HorarioDiaUI[] = [];
  horasDisponibles = HORAS_DISPONIBLES;
  cargando         = true;
  esModal          = false; // true cuando viene desde usuarios

  ngOnInit() {
    const uidRuta = this.route.snapshot.paramMap.get('uid');
    this.esModal  = !!this.uid;           // si llegó por @Input es modal
    this.uid      = this.uid || uidRuta || '';
    this.inicializar();
  }

  async inicializar() {
    this.cargando = true;
    try {
      const vet      = await this.userService.getDocumentOnce('veterinarios', this.uid);
      this.nombreVet = vet ? `${vet.Nombre} ${vet.Apellido}` : '';

      const guardados = await this.horarioService.getHorariosOnce(this.uid);
      const map       = new Map(guardados.map(h => [h.dia, h]));

      this.dias = DIAS_SEMANA.map(dia => {
        const guardado = map.get(dia);
        const turnos   = (guardado?.turnos ?? []).map(t => this.turnoConPreset(t));
        return {
          dia,
          label:              LABELS[dia],
          activo:             guardado?.activo ?? false,
          turnos,
          slotsSeleccionados: this.turnosASlots(turnos),
        };
      });
    } finally {
      this.cargando = false;
    }
  }

  // ── Slots ──────────────────────────────────────────────────────────────────

  toggleSlot(dia: HorarioDiaUI, slot: string) {
    if (!dia.activo) return;
    const idx = dia.slotsSeleccionados.indexOf(slot);
    if (idx >= 0) dia.slotsSeleccionados.splice(idx, 1);
    else          dia.slotsSeleccionados.push(slot);
    dia.slotsSeleccionados.sort();
    this.recalcularTurnos(dia);
  }

  isSlotSeleccionado(dia: HorarioDiaUI, slot: string): boolean {
    return dia.slotsSeleccionados.includes(slot);
  }

  recalcularTurnos(dia: HorarioDiaUI) {
    if (dia.slotsSeleccionados.length === 0) { dia.turnos = []; return; }

    const sorted = [...dia.slotsSeleccionados].sort();
    const grupos: string[][] = [];
    let grupo = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (this.toMinutos(sorted[i]) - this.toMinutos(sorted[i-1]) === 30) {
        grupo.push(sorted[i]);
      } else {
        grupos.push(grupo);
        grupo = [sorted[i]];
      }
    }
    grupos.push(grupo);

    dia.turnos = grupos.map(g => ({
      inicio: g[0],
      fin:    this.sumarMinutos(g[g.length - 1], 30),
      preset: this.detectarPreset(g[0], this.sumarMinutos(g[g.length - 1], 30)),
    }));
  }

  // ── Presets ────────────────────────────────────────────────────────────────

  tienePreset(dia: HorarioDiaUI, preset: 'manana' | 'tarde'): boolean {
    const slots = this.presetASlots(preset);
    return slots.every(s => dia.slotsSeleccionados.includes(s));
  }

  togglePreset(dia: HorarioDiaUI, preset: 'manana' | 'tarde') {
    if (!dia.activo) return;
    const slots = this.presetASlots(preset);

    if (this.tienePreset(dia, preset)) {
      dia.slotsSeleccionados = dia.slotsSeleccionados.filter(s => !slots.includes(s));
    } else {
      slots.forEach(s => { if (!dia.slotsSeleccionados.includes(s)) dia.slotsSeleccionados.push(s); });
      dia.slotsSeleccionados.sort();
    }
    this.recalcularTurnos(dia);
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  async guardar() {
    const loading = await this.loadingCtrl.create({ message: 'Guardando horarios…' });
    await loading.present();
    try {
      const horarios: HorarioDia[] = this.dias.map(d => ({
        dia:    d.dia,
        activo: d.activo,
        turnos: d.turnos.map(t => ({ inicio: t.inicio, fin: t.fin })),
      }));
      await this.horarioService.guardarTodosLosHorarios(this.uid, horarios);
      this.toast('Horarios guardados correctamente', 'success');
      if (this.esModal) await this.modalCtrl.dismiss({ guardado: true });
    } catch (e) {
      console.error(e);
      this.toast('Error al guardar los horarios', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  // ── Copia rápida ───────────────────────────────────────────────────────────

  copiarSemanaLaboral() {
    const lunes = this.dias.find(d => d.dia === 'lunes');
    if (!lunes) return;
    ['martes','miercoles','jueves','viernes'].forEach(diaKey => {
      const d = this.dias.find(x => x.dia === diaKey)!;
      d.activo             = lunes.activo;
      d.slotsSeleccionados = [...lunes.slotsSeleccionados];
      d.turnos             = lunes.turnos.map(t => ({ ...t }));
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private presetASlots(preset: 'manana' | 'tarde'): string[] {
    const p = TURNOS_PRESET[preset];
    const slots: string[] = [];
    let cur = this.toMinutos(p.inicio);
    while (cur < this.toMinutos(p.fin)) {
      slots.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'00')}`);
      cur += 30;
    }
    return slots;
  }

  private turnosASlots(turnos: TurnoUI[]): string[] {
    const slots: string[] = [];
    for (const t of turnos) {
      let cur = this.toMinutos(t.inicio);
      while (cur < this.toMinutos(t.fin)) {
        slots.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);
        cur += 30;
      }
    }
    return slots;
  }

  private turnoConPreset(t: Turno): TurnoUI {
    const pm = TURNOS_PRESET['manana'];
    const pt = TURNOS_PRESET['tarde'];
    let preset: TurnoUI['preset'] = 'custom';
    if (t.inicio === pm.inicio && t.fin === pm.fin) preset = 'manana';
    if (t.inicio === pt.inicio && t.fin === pt.fin) preset = 'tarde';
    return { ...t, preset };
  }

  private detectarPreset(inicio: string, fin: string): TurnoUI['preset'] {
    const pm = TURNOS_PRESET['manana'];
    const pt = TURNOS_PRESET['tarde'];
    if (inicio === pm.inicio && fin === pm.fin) return 'manana';
    if (inicio === pt.inicio && fin === pt.fin) return 'tarde';
    return 'custom';
  }

  private toMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private sumarMinutos(hora: string, mins: number): string {
    const total = this.toMinutos(hora) + mins;
    return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  }

  formatHora12Slot(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  getSlotsPreview(dia: HorarioDiaUI): string {
    if (!dia.activo || dia.turnos.length === 0) return 'Sin horario';
    return dia.turnos.map(t =>
      `${this.formatHora12Slot(t.inicio)} – ${this.formatHora12Slot(t.fin)}`
    ).join('  ·  ');
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'top' });
    await t.present();
  }
}