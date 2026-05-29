import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Cita } from 'src/app/core/services/cita.service';
import { Mascota } from 'src/app/core/services/mascota.service';
import { DiagnosticoService, Diagnostico } from 'src/app/core/services/diagnostico.service';

@Component({
  selector: 'app-historial-citas',
  templateUrl: './historial-citas.component.html',
  styleUrls: ['./historial-citas.component.scss'],
  standalone: false,
})
export class HistorialCitasComponent implements OnInit {

  @Input() mascota!: Mascota;
  @Input() citas: Cita[] = [];

  citaSeleccionada: Cita | null = null;

  // Lista de diagnósticos de la cita seleccionada (máximo 1 por cita, pero preparado para expandir)
  diagnosticos: Diagnostico[] = [];
  cargandoDiag = false;

  // Índice del diagnóstico expandido (-1 = ninguno)
  expandidoIdx = 0;

  // Cache para no repetir consultas
  private diagCache: Record<string, Diagnostico | null> = {};

  constructor(
    private modalCtrl:      ModalController,
    private diagnosticoSvc: DiagnosticoService,
  ) {}

  ngOnInit() {
    if (this.citas.length > 0) {
      this.seleccionar(this.citas[0]);
    }
  }

  async seleccionar(cita: Cita) {
    this.citaSeleccionada = cita;
    this.diagnosticos     = [];
    this.expandidoIdx     = 0;

    if (cita.estado !== 'finalizada') return;

    if (cita.idCita in this.diagCache) {
      const d = this.diagCache[cita.idCita];
      this.diagnosticos = d ? [d] : [];
      return;
    }

    this.cargandoDiag = true;
    try {
      const diag = await this.diagnosticoSvc.getOnce(cita.idCita);
      this.diagCache[cita.idCita] = diag;
      this.diagnosticos = diag ? [diag] : [];
    } catch (e) {
      console.error(e);
      this.diagnosticos = [];
    }
    this.cargandoDiag = false;
  }

  toggleDiag(idx: number) {
    this.expandidoIdx = this.expandidoIdx === idx ? -1 : idx;
  }

  cerrar() { this.modalCtrl.dismiss(); }

  // ── Helpers ──────────────────────────────────────────────────────

  labelEstado(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'Finalizada', pendiente: 'Pendiente',
      cancelada: 'Cancelada', no_asistio: 'No asistió', en_proceso: 'En proceso',
    };
    return map[estado] ?? estado;
  }

  badgeClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'b-fin', pendiente: 'b-pen', cancelada: 'b-can',
      no_asistio: 'b-nas', en_proceso: 'b-con',
    };
    return map[estado] ?? 'b-nas';
  }

  pillClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'ep-fin', pendiente: 'ep-pen', cancelada: 'ep-can',
      no_asistio: 'ep-nas', en_proceso: 'ep-con',
    };
    return map[estado] ?? 'ep-nas';
  }

  dotClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'epd-fin', pendiente: 'epd-pen', cancelada: 'epd-can',
      no_asistio: 'epd-nas', en_proceso: 'epd-con',
    };
    return map[estado] ?? 'epd-nas';
  }

  txtClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'ept-fin', pendiente: 'ept-pen', cancelada: 'ept-can',
      no_asistio: 'ept-nas', en_proceso: 'ept-con',
    };
    return map[estado] ?? 'ept-nas';
  }

  iconoCita(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'checkmark-circle-outline', pendiente: 'time-outline',
      cancelada: 'close-circle-outline', no_asistio: 'person-remove-outline',
      en_proceso: 'reload-outline',
    };
    return map[estado] ?? 'ellipse-outline';
  }

  iconBg(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: '#E1F5EE', pendiente: '#FAEEDA',
      cancelada: '#FCEBEB', no_asistio: '#f3f4f6', en_proceso: '#E6F1FB',
    };
    return map[estado] ?? '#f3f4f6';
  }

  iconColor(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: '#1D9E75', pendiente: '#BA7517',
      cancelada: '#E24B4A', no_asistio: '#9ca3af', en_proceso: '#378ADD',
    };
    return map[estado] ?? '#9ca3af';
  }

  emojiEspecie(especie: string): string {
    const map: Record<string, string> = {
      perro: '🐕', gato: '🐱', ave: '🦜', reptil: '🦎', otro: '🐾'
    };
    return map[especie?.toLowerCase()] ?? '🐾';
  }

  formatearFecha(iso: string): string {
    if (!iso) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatearFechaHora(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
