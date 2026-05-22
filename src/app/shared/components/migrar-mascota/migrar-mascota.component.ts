// migrar-mascota.component.ts
import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { MascotaService, Mascota } from 'src/app/core/services/mascota.service';
import { Observable, map } from 'rxjs';

interface Cliente {
  idCliente: string;
  Nombre: string;
  Apellido: string;
  Correo: string;
  estado: string;
}

@Component({
  selector: 'app-migrar-mascota',
  templateUrl: './migrar-mascota.component.html',
  standalone: false,
  styleUrls: ['./migrar-mascota.component.scss']
})
export class MigrarMascotaComponent implements OnInit {
  @Input() mascota!: Mascota;

  private firestore    = inject(Firestore);
  private mascotaSvc   = inject(MascotaService);
  private modalCtrl    = inject(ModalController);
  private toastCtrl    = inject(ToastController);
  private loadingCtrl  = inject(LoadingController);

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;
  terminoBusqueda = '';

  async ngOnInit() {
    // Carga clientes activos, excluye al dueño actual
    collectionData(
      collection(this.firestore, 'clientes'),
      { idField: 'idCliente' }
    ).pipe(
      map((lista: any[]) =>
        lista.filter(c =>
          c.estado === 'activo' &&
          c.idCliente !== this.mascota.idCliente
        )
      )
    ).subscribe(clientes => {
      this.clientes = clientes;
      this.clientesFiltrados = clientes;
    });
  }

  filtrar(evento: Event) {
    const q = (evento.target as HTMLInputElement).value.toLowerCase();
    this.terminoBusqueda = q;
    this.clientesFiltrados = this.clientes.filter(c =>
      `${c.Nombre} ${c.Apellido}`.toLowerCase().includes(q) ||
      c.Correo.toLowerCase().includes(q)
    );
  }

  seleccionar(cliente: Cliente) {
    this.clienteSeleccionado =
      this.clienteSeleccionado?.idCliente === cliente.idCliente ? null : cliente;
  }

  iniciales(cliente: Cliente): string {
    return `${cliente.Nombre[0]}${cliente.Apellido[0]}`.toUpperCase();
  }

  async migrar() {
  if (!this.clienteSeleccionado) return;

  const loading = await this.loadingCtrl.create({ message: 'Migrando mascota...' });
  await loading.present();

  try {
    // Construye el objeto antes de enviarlo al servicio
    const datosMigrados: Mascota = {
      ...this.mascota,                                        // copia todos los datos originales
      idCliente: this.clienteSeleccionado.idCliente,          // nuevo dueño
      idClienteAnterior: this.mascota.idCliente,              // guarda el dueño anterior
      fechaMigracion: new Date().toISOString(),               // fecha del cambio
      // NO sobreescribe fechaRegistro — conserva la original
    };

    // 1. Crear en subcolección del nuevo cliente
    await this.mascotaSvc.registrarMascota(datosMigrados);

    // 2. Eliminar de la subcolección del cliente anterior
    await this.mascotaSvc.eliminarMascota(
      this.mascota.idCliente,   // ruta vieja
      this.mascota.idMascota    // mismo idMascota — se preserva
    );

    await loading.dismiss();
    await this.mostrarToast(`${this.mascota.nombre} migrada correctamente`, 'success');
    await this.modalCtrl.dismiss({ migrado: true });

  } catch (error) {
    await loading.dismiss();
    await this.mostrarToast('Error al migrar la mascota', 'danger');
    console.error('Error en migración:', error);
  }
}

  cerrar() {
    this.modalCtrl.dismiss({ migrado: false });
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