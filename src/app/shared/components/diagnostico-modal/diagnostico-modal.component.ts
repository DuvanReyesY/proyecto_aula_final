import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { DiagnosticoService, Diagnostico } from 'src/app/core/services/diagnostico.service';
import { Cita } from 'src/app/core/services/cita.service';

@Component({
  selector: 'app-diagnostico-modal',
  templateUrl: './diagnostico-modal.component.html',
  styleUrls: ['./diagnostico-modal.component.scss'],
  standalone: false,
})
export class DiagnosticoModalComponent implements OnInit {

  // La cita finalizada desde la que se abre el modal
  @Input() cita!: Cita;
  // Nombre del veterinario logueado (ya resuelto en citas.page.ts)
  @Input() nombreVeterinario: string = '';
  // Si viene true, el usuario solo puede ver (recepcionista)
  @Input() soloLectura: boolean = false;

  private diagnosticoSvc = inject(DiagnosticoService);
  private modalCtrl      = inject(ModalController);
  private toastCtrl      = inject(ToastController);
  private loadingCtrl    = inject(LoadingController);

  // Campos del formulario
  sintomas      = '';
  diagnostico   = '';
  tratamiento   = '';
  medicamentos  = '';
  observaciones = '';

  cargando   = true;
  guardando  = false;
  esEdicion  = false;   // true si ya existe un diagnóstico previo

  async ngOnInit() {
    // Intentar cargar diagnóstico previo si ya existe
    const existente = await this.diagnosticoSvc.getOnce(this.cita.idCita);
    if (existente) {
      this.esEdicion    = true;
      this.sintomas      = existente.sintomas      ?? '';
      this.diagnostico   = existente.diagnostico   ?? '';
      this.tratamiento   = existente.tratamiento   ?? '';
      this.medicamentos  = existente.medicamentos  ?? '';
      this.observaciones = existente.observaciones ?? '';
    }
    this.cargando = false;
  }

  get formularioValido(): boolean {
    return !!(this.sintomas.trim() && this.diagnostico.trim() && this.tratamiento.trim());
  }

  async guardar() {
    if (!this.formularioValido || this.soloLectura) return;

    const loading = await this.loadingCtrl.create({
      message: this.esEdicion ? 'Actualizando diagnóstico...' : 'Guardando diagnóstico...',
    });
    await loading.present();

    try {
      const payload: Diagnostico = {
        idCita:             this.cita.idCita,
        idVeterinario:      this.cita.idVeterinario,
        nombreVeterinario:  this.nombreVeterinario,
        idMascota:          this.cita.idMascota,
        nombreMascota:      this.cita.nombreMascota,
        idCliente:          this.cita.idCliente,
        sintomas:           this.sintomas.trim(),
        diagnostico:        this.diagnostico.trim(),
        tratamiento:        this.tratamiento.trim(),
        medicamentos:       this.medicamentos.trim(),
        observaciones:      this.observaciones.trim(),
        fechaDiagnostico:   new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      };

      await this.diagnosticoSvc.guardar(payload);
      await loading.dismiss();
      await this.mostrarToast(
        this.esEdicion ? 'Diagnóstico actualizado' : 'Diagnóstico guardado correctamente',
        'success'
      );
      await this.modalCtrl.dismiss({ guardado: true });

    } catch (err) {
      await loading.dismiss();
      console.error(err);
      await this.mostrarToast('Error al guardar el diagnóstico', 'danger');
    }
  }

  cerrar() {
    this.modalCtrl.dismiss({ guardado: false });
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
