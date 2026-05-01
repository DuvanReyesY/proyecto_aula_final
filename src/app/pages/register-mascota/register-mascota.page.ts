import { Component, OnInit} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PopoverController, ToastController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { inject } from '@angular/core';

import { MascotaService, Mascota } from 'src/app/core/services/mascota.service';
import { UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'app-register-mascota',
  templateUrl: './register-mascota.page.html',
  styleUrls: ['./register-mascota.page.scss'],
  standalone: false,
})
export class RegisterMascotaPage implements OnInit {



  idClienteEdit = '';
  form!: FormGroup;
  formSubmitted = false;
  guardando     = false;
  modoEdicion   = false;
  idMascotaEdit = '';

  razasDisponibles: string[] = [];
  cargandoRazas             = false;
  clienteSeleccionado: any   = null;

  readonly especies = ['perro', 'gato', 'ave', 'reptil', 'otro'];
  readonly hoySimple = new Date().toISOString().split('T')[0];
  private auth = inject(Auth);

  modalFechaAbierto = false;
  private fechaTemporal: string = '';

  constructor(
    private fb:          FormBuilder,
    private route:       ActivatedRoute,
    private router:      Router,
    private mascotaSvc:  MascotaService,
    private userSvc:     UserService,
    private popoverCtrl: PopoverController,
    private toastCtrl:   ToastController,
  ) {}

  async ngOnInit() {
    this.construirFormulario();

    this.route.queryParams.subscribe(async params => {
      if (params['modo'] === 'editar' && params['id']) {
        this.modoEdicion   = true;
        this.idMascotaEdit = params['id'];
        this.idClienteEdit = params['idCliente'];
        await this.cargarMascota(params['id']);
      } else {
        this.modoEdicion = false;
      }
    });
  }

  private construirFormulario() {
    this.form = this.fb.group({
      nombre:          ['', Validators.required],
      especie:         ['', Validators.required],
      raza:            ['', Validators.required],
      sexo:            ['macho', Validators.required],
      fechaNacimiento: ['', Validators.required],
      color:           [''],
      peso:            [null, [Validators.required, Validators.min(0)]],
    });
  }

  get fc() { return this.form.controls; }

  private async cargarMascota(id: string) {
    const mascota = await this.mascotaSvc.getMascotaOnce(this.idClienteEdit, id);
    if (!mascota) return;

    this.form.patchValue({
      nombre:          mascota.nombre,
      especie:         mascota.especie,
      raza:            mascota.raza,
      sexo:            mascota.sexo,
      fechaNacimiento: mascota.fechaNacimiento,
      color:           mascota.color,
      peso:            mascota.peso,
    });

    await this.cargarRazas(mascota.especie);

    const { firstValueFrom } = await import('rxjs');
    const clientes = await firstValueFrom(this.userSvc.getTodosLosUsuarios());
    this.clienteSeleccionado = clientes.find(
      c => c.idCliente === mascota.idCliente || c.uid === mascota.idCliente
    ) ?? null;
  }

  async onEspecieChange() {
    const especie = this.fc['especie'].value;
    this.fc['raza'].reset();
    this.razasDisponibles = [];
    if (!especie) return;
    await this.cargarRazas(especie);
  }

  private async cargarRazas(especie: string) {
    this.cargandoRazas = true;
    this.razasDisponibles = await this.mascotaSvc.getRazasPorEspecie(especie);
    this.cargandoRazas = false;
  }

  async abrirSelectorCliente(event: Event) {
    const { ClienteSelectorComponent } = await import(
      'src/app/shared/components/cliente-selector/cliente-selector.component'
    );

    const popover = await this.popoverCtrl.create({
      component: ClienteSelectorComponent,
      event,
      translucent: true,
      cssClass: 'popover-cliente',
    });

    await popover.present();

    const { data } = await popover.onWillDismiss();
    if (data?.cliente) {
      this.clienteSeleccionado = data.cliente;
    }
  }

  async guardar() {
    this.formSubmitted = true;

    const clienteRequerido = !this.modoEdicion && !this.clienteSeleccionado;
    if (this.form.invalid || clienteRequerido) return;

    this.guardando = true;

    const idCliente = this.modoEdicion
      ? this.idClienteEdit
      : (this.clienteSeleccionado.idCliente ?? this.clienteSeleccionado.uid);

    const datos: Omit<Mascota, 'idMascota'> = {
      idCliente,
      nombre:          this.fc['nombre'].value,
      especie:         this.fc['especie'].value,
      raza:            this.fc['raza'].value,
      sexo:            this.fc['sexo'].value,
      fechaNacimiento: this.fc['fechaNacimiento'].value,
      color:           this.fc['color'].value ?? '',
      peso:            this.fc['peso'].value,
      estado:          'activo',
      fechaRegistro:   new Date().toISOString(),
    };

    try {
      if (this.modoEdicion) {
        await this.mascotaSvc.actualizarMascota(this.idClienteEdit, this.idMascotaEdit, datos);
        this.mostrarToast('Mascota actualizada correctamente', 'success');
      } else {
        await this.mascotaSvc.registrarMascota(datos);
        this.mostrarToast('Mascota registrada correctamente', 'success');
      }
      this.router.navigate(['/layout/mascotas']);
    } catch {
      this.mostrarToast('Error al guardar la mascota', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      buttons: [{ icon: 'close-outline', role: 'cancel' }],
    });
    await toast.present();
  }

onFechaNativaChange(event: any) {
  const fecha = event.target.value ?? '';
  if (fecha) {
    this.fc['fechaNacimiento'].setValue(fecha);
    this.fc['fechaNacimiento'].markAsDirty();
    this.fc['fechaNacimiento'].markAsTouched();
  }
}


}