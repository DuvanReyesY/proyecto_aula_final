// citas-slot-popover.component.ts
import { Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { Cita } from 'src/app/core/services/cita.service';

@Component({
  selector: 'app-citas-slot-popover',
  templateUrl: './citas-slot-popover.component.html',
  styleUrls: ['./citas-slot-popover.component.scss'],
  standalone: false,
})
export class CitasSlotPopoverComponent {
  @Input() citas: Cita[] = [];

  private readonly TIPO_COLORS: Record<string, string> = {
    'Consulta general': '#185FA5',
    'Vacunación':       '#3B6D11',
    'Cirugía':          '#A32D2D',
    'Urgencia':         '#854F0B',
    'Control':          '#534AB7',
  };

  constructor(private popoverCtrl: PopoverController) {}

  seleccionar(cita: Cita) {
    this.popoverCtrl.dismiss({ cita });
  }

  getColor(cita: Cita): string {
    return this.TIPO_COLORS[cita.tipo] ?? '#888';
  }

  getBadgeClass(tipo: string): string {
    const map: Record<string, string> = {
      'Consulta general': 'badge-consulta',
      'Vacunación':       'badge-vacuna',
      'Cirugía':          'badge-cirugia',
      'Urgencia':         'badge-urgencia',
      'Control':          'badge-control',
    };
    return map[tipo] ?? 'badge-control';
  }

  cerrar() {
  this.popoverCtrl.dismiss();
}

nuevaCita() {
  this.popoverCtrl.dismiss({ action: 'nueva' });
}

verDia() {
  this.popoverCtrl.dismiss({ action: 'verDia' });
}

getEstadoClass(estado?: string): string {
  const key = (estado ?? '').toLowerCase().replace(/ /g, '_').trim();
  const map: Record<string, string> = {
    pendiente:  'estado-pendiente',
    en_proceso: 'estado-proceso',
    finalizada: 'estado-finalizada',
    cancelada:  'estado-cancelada',
    no_asistio: 'estado-no-asistio',
  };
  return map[key] ?? 'estado-pendiente';
}

getEstadoLabel(estado?: string): string {
  const key = (estado ?? '').toLowerCase().replace(/ /g, '_').trim();
  const map: Record<string, string> = {
    pendiente:  'Pendiente',
    en_proceso: 'En proceso',
    finalizada: 'Finalizada',
    cancelada:  'Cancelada',
    no_asistio: 'No asistió',
  };
  return map[key] ?? estado ?? 'Pendiente';
}
}