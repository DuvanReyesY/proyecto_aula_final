import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { map } from 'rxjs';

import { CitaService, Cita } from 'src/app/core/services/cita.service';

interface Veterinario {
  idVeterinario: string;
  Nombre: string;
  Apellido: string;
  Especialidad?: string;
  estado: string;
}

@Component({
  selector: 'app-reasignar-veterinario',
  templateUrl: './reasignar-veterinario.component.html',
  standalone: false,
  styleUrls: ['./reasignar-veterinario.component.scss']
})
export class ReasignarVeterinarioComponent implements OnInit {
  @Input() cita!: Cita;
  @Input() nombreVeterinarioActual = '';

  private firestore   = inject(Firestore);
  private citaSvc     = inject(CitaService);
  private modalCtrl   = inject(ModalController);
  private toastCtrl   = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  veterinarios: Veterinario[]         = [];
  veterinariosFiltrados: Veterinario[] = [];
  veterinarioSeleccionado: Veterinario | null = null;
  terminoBusqueda = '';
  motivoReasignacion = '';

  async ngOnInit() {
    collectionData(
      collection(this.firestore, 'veterinarios'),
      { idField: 'idVeterinario' }
    ).pipe(
      map((lista: any[]) =>
        lista.filter(v =>
          v.estado === 'activo' &&
          v.idVeterinario !== this.cita.idVeterinario
        )
      )
    ).subscribe(vets => {
      this.veterinarios          = vets;
      this.veterinariosFiltrados = vets;
    });
  }

  filtrar(evento: Event) {
    const q = (evento.target as HTMLInputElement).value.toLowerCase();
    this.terminoBusqueda = q;
    this.veterinariosFiltrados = this.veterinarios.filter(v =>
      `${v.Nombre} ${v.Apellido}`.toLowerCase().includes(q) ||
      (v.Especialidad ?? '').toLowerCase().includes(q)
    );
  }

  seleccionar(vet: Veterinario) {
    this.veterinarioSeleccionado =
      this.veterinarioSeleccionado?.idVeterinario === vet.idVeterinario ? null : vet;
  }

  iniciales(vet: Veterinario): string {
    return `${vet.Nombre[0]}${vet.Apellido[0]}`.toUpperCase();
  }

  async reasignar() {
    if (!this.veterinarioSeleccionado) return;

    const loading = await this.loadingCtrl.create({ message: 'Reasignando veterinario...' });
    await loading.present();

    try {
      const notaReasignacion =
        `[Reasignación ${new Date().toLocaleDateString('es-CO')}] ` +
        `Sustituto de: ${this.nombreVeterinarioActual}. ` +
        (this.motivoReasignacion ? `Motivo: ${this.motivoReasignacion}. ` : '') +
        `Nuevo: ${this.veterinarioSeleccionado.Nombre} ${this.veterinarioSeleccionado.Apellido}.`;

      const notasActualizadas = this.cita.notas
        ? `${this.cita.notas}\n${notaReasignacion}`
        : notaReasignacion;

      await this.citaSvc.actualizarCita(this.cita.idCita, {
        idVeterinario:     this.veterinarioSeleccionado.idVeterinario,
        nombreVeterinario: `${this.veterinarioSeleccionado.Nombre} ${this.veterinarioSeleccionado.Apellido}`,
        notas:             notasActualizadas,
      } as any);

      await loading.dismiss();
      await this.mostrarToast('Veterinario reasignado correctamente', 'success');
      await this.modalCtrl.dismiss({ reasignado: true });

    } catch (error) {
      await loading.dismiss();
      await this.mostrarToast('Error al reasignar el veterinario', 'danger');
      console.error('Error en reasignación:', error);
    }
  }

  cerrar() {
    this.modalCtrl.dismiss({ reasignado: false });
  }

  private async mostrarToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 'close-circle',
    });
    await toast.present();
  }
}