import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CitaService, Cita } from 'src/app/core/services/cita.service';
import { Mascota } from 'src/app/core/services/mascota.service';
import { ModalController } from '@ionic/angular';
import { HistorialCitasComponent } from '../historial-citas/historial-citas.component';
 import { firstValueFrom, of } from 'rxjs';

@Component({
  selector: 'app-mascota-detalle',
  templateUrl: './mascota-detalle.component.html',
  styleUrls: ['./mascota-detalle.component.scss'],
  standalone: false
})
export class MascotaDetalleComponent {

  // ✅ Recibe la mascota desde el padre, no desde la ruta
  @Input() set mascota(m: Mascota | null) {
    this._mascota = m;
    if (m?.idMascota) this.cargarCitas(m.idMascota);
  }
  get mascota() { return this._mascota; }
  private _mascota: Mascota | null = null;

  // ✅ Emite eventos al padre en vez de navegar solo
  @Output() editar   = new EventEmitter<Mascota>();
  @Output() agendar  = new EventEmitter<Mascota>();
  @Output() verCita  = new EventEmitter<Cita>();

  citas$: Observable<Cita[]> | null = null;

  constructor(private citaService: CitaService, private modalCtrl: ModalController, ) { 
    
  }

  private cargarCitas(idMascota: string) {
    this.citas$ = this.citaService.getTodas().pipe(
      map(citas =>
        citas
          .filter(c => c.idMascota === idMascota)
          .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro))
      )
    );
  }

  onEditar()          { if (this._mascota) this.editar.emit(this._mascota); }
  onAgendar()         { if (this._mascota) this.agendar.emit(this._mascota); }
  onVerCita(c: Cita)  { this.verCita.emit(c); }

  emojiEspecie(especie: string): string {
    const map: Record<string, string> = {
      perro: '🐕', gato: '🐱', ave: '🦜', reptil: '🦎', otro: '🐾'
    };
    return map[especie?.toLowerCase()] ?? '🐾';
  }

  iconoCita(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'checkmark-circle-outline',
      pendiente:  'time-outline',
      confirmada: 'calendar-outline',
      cancelada:  'close-circle-outline'
    };
    return map[estado] ?? 'ellipse-outline';
  }

  colorCita(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      finalizada: 'success', pendiente: 'warning',
      confirmada: 'primary', cancelada: 'danger'
    };
    return map[estado] ?? 'medium';
  }

  calcularEdad(fechaNacimiento: string): string {
    if (!fechaNacimiento) return '';
    const hoy  = new Date();
    const nac  = new Date(fechaNacimiento);
    let edad   = hoy.getFullYear() - nac.getFullYear();
    const m    = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad <= 0 ? 'Menos de 1 año' : edad === 1 ? '1 año' : `${edad} años`;
  }

  formatearFecha(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  async abrirHistorial() {
  if (!this._mascota) return;
 
  // Esperar el valor actual del observable de citas
  const citas = await firstValueFrom(this.citas$ ?? of([]));
 
  const modal = await this.modalCtrl.create({
    component: HistorialCitasComponent,
    componentProps: {
      mascota: this._mascota,
      citas,                      // ya están cargadas, sin doble fetch
    },
    breakpoints: [0, 1],
    initialBreakpoint: 1,
  });
 
  await modal.present();
}

cerrar() {
  this.modalCtrl.dismiss();
}
 
}