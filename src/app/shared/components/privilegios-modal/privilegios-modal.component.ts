import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PrivilegiosService, Privilegios } from 'src/app/core/services/privilegios.service';

@Component({
  selector: 'app-privilegios-modal',
  templateUrl: './privilegios-modal.component.html',
  styleUrls: ['./privilegios-modal.component.scss'],
  standalone: false
})
export class PrivilegiosModalComponent implements OnInit {
  @Input() usuario: any;

  // ✅ any porque la forma varía según el rol del usuario
  privilegios: any = {};

  guardando: boolean = false;
  cargando:  boolean = true;  // ✅ variable que el HTML ya usaba pero faltaba declarar

  // Definición de etiquetas para el HTML (sin cambios, ya estaban bien)
  privilegiosRecep = [
    { key: 'crearUsuarios',    label: 'Crear usuarios' },
    { key: 'editarUsuarios',   label: 'Editar usuarios' },
    { key: 'verUsuarios',      label: 'Ver usuarios' },
    { key: 'crearMascotas',    label: 'Crear mascotas' },
    { key: 'editarMascotas',   label: 'Editar mascotas' },
    { key: 'verMascotas',      label: 'Ver mascotas' },
    { key: 'crearCitas',       label: 'Crear citas' },
    { key: 'cancelarCitas',    label: 'Cancelar citas' },
    { key: 'reprogramarCitas', label: 'Reprogramar citas' },
    { key: 'verCitas',         label: 'Ver citas' },
  ];

  privilegiosVet = [
    { key: 'verCitasAsignadas',   label: 'Ver citas asignadas' },
    { key: 'diagnosticarCitas',   label: 'Diagnosticar citas' },
    { key: 'verHistorialMascota', label: 'Ver historial de mascota' },
  ];

  constructor(
    private modalCtrl: ModalController,
    private privilegiosService: PrivilegiosService
  ) {}

  ngOnInit() {
    // ✅ Se usa this.usuario.uid (no this.usuario.rol)
    this.privilegiosService.getPrivilegios(this.usuario.uid).subscribe(p => {
      if (p) this.privilegios = p;
      this.cargando = false; // ✅ apagar spinner cuando llegan los datos
    });
  }

  async guardar() {
    this.guardando = true;
    // ✅ Se usa this.usuario.uid (no this.usuario.rol)
    await this.privilegiosService.setPrivilegios(
      this.usuario.uid,
      this.privilegios as Privilegios
    );
    this.guardando = false;
    this.cerrar();
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}