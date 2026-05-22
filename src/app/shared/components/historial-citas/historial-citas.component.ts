import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Cita } from 'src/app/core/services/cita.service';
import { Mascota } from 'src/app/core/services/mascota.service';

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

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    // Seleccionar la primera cita automáticamente si existe
    if (this.citas.length > 0) {
      this.citaSeleccionada = this.citas[0];
    }
  }

  seleccionar(cita: Cita) {
    this.citaSeleccionada = cita;
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }

  // ── Helpers de estado ────────────────────────────────────────────

  labelEstado(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'Finalizada',
      pendiente:  'Pendiente',
      confirmada: 'Confirmada',
      cancelada:  'Cancelada',
      no_asistio: 'No asistió',
      en_proceso: 'En proceso',
    };
    return map[estado] ?? estado;
  }

  badgeClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'b-fin',
      pendiente:  'b-pen',
      confirmada: 'b-con',
      cancelada:  'b-can',
      no_asistio: 'b-nas',
      en_proceso: 'b-con',
    };
    return map[estado] ?? 'b-nas';
  }

  pillClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'ep-fin',
      pendiente:  'ep-pen',
      confirmada: 'ep-con',
      cancelada:  'ep-can',
      no_asistio: 'ep-nas',
      en_proceso: 'ep-con',
    };
    return map[estado] ?? 'ep-nas';
  }

  dotClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'epd-fin',
      pendiente:  'epd-pen',
      confirmada: 'epd-con',
      cancelada:  'epd-can',
      no_asistio: 'epd-nas',
      en_proceso: 'epd-con',
    };
    return map[estado] ?? 'epd-nas';
  }

  txtClase(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'ept-fin',
      pendiente:  'ept-pen',
      confirmada: 'ept-con',
      cancelada:  'ept-can',
      no_asistio: 'ept-nas',
      en_proceso: 'ept-con',
    };
    return map[estado] ?? 'ept-nas';
  }

  iconoCita(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'checkmark-circle-outline',
      pendiente:  'time-outline',
      confirmada: 'calendar-outline',
      cancelada:  'close-circle-outline',
      no_asistio: 'person-remove-outline',
      en_proceso: 'reload-outline',
    };
    return map[estado] ?? 'ellipse-outline';
  }

  iconBg(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: '#E1F5EE',
      pendiente:  '#FAEEDA',
      confirmada: '#E6F1FB',
      cancelada:  '#FCEBEB',
      no_asistio: '#f3f4f6',
      en_proceso: '#E6F1FB',
    };
    return map[estado] ?? '#f3f4f6';
  }

  iconColor(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: '#1D9E75',
      pendiente:  '#BA7517',
      confirmada: '#378ADD',
      cancelada:  '#E24B4A',
      no_asistio: '#9ca3af',
      en_proceso: '#378ADD',
    };
    return map[estado] ?? '#9ca3af';
  }

  // ── Helpers generales ────────────────────────────────────────────

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
}
