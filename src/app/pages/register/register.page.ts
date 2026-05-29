import { Component, Input, OnInit } from '@angular/core';  // ← agrega Input
import { Router, ActivatedRoute } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';  // ← agrega ModalController
import { UserService } from 'src/app/core/services/user.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {

  // ── Inputs desde el modal ──────────────────
  @Input() modoEdicionInput: boolean = false;
  @Input() uidEditarInput: string = '';
  @Input() rolInput: string = '';

  role: string = 'cliente';
  rolActual: string = '';
  registrando: boolean = false;
  guardando: boolean = false;
  mostrarPassword: boolean = false;
  cargando: boolean = false;

  modoEdicion: boolean = false;
  uidEditar: string = '';

  user: any = {
    Nombre: '', Apellido: '', Telefono: '',
    Correo: '', Contrasena: '', Cedula: '',
    Especialidad: '', estado: 'activo', idAdministrador: ''
  };

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,  // ← agrega esto
  ) {}

  async ngOnInit() {
    this.rolActual = this.authService.getRolActual() ?? '';
    this.user.idAdministrador = this.authService.getUidActual() ?? '';

    // ── Si viene como modal ──────────────────
    if (this.modoEdicionInput && this.uidEditarInput) {
      this.modoEdicion = true;
      this.uidEditar   = this.uidEditarInput;
      this.role        = this.rolInput;
      this.cargando    = true;

      const coleccion = this.userService.getColeccionPorRol(this.role);
      const datos     = await this.userService.getDocumentOnce(coleccion, this.uidEditar);
      if (datos) this.user = { ...this.user, ...datos };

      this.cargando = false;
      return;
    }

    // ── Fallback: si se abre por ruta ────────
    const uid = this.route.snapshot.paramMap.get('uid');
    const rol = this.route.snapshot.paramMap.get('rol');

    if (uid && rol) {
      this.modoEdicion = true;
      this.uidEditar   = uid;
      this.role        = rol;
      this.cargando    = true;

      const coleccion = this.userService.getColeccionPorRol(rol);
      const datos     = await this.userService.getDocumentOnce(coleccion, uid);
      if (datos) this.user = { ...this.user, ...datos };

      this.cargando = false;
    } else {
      if (this.rolActual === 'recepcionista') this.role = 'cliente';
    }
  }

  cerrarModal(guardado = false) {
    this.modalCtrl.dismiss({ guardado });
  }

  getRoleIcon(): string {
    const icons: any = {
      administrador: 'shield-checkmark-outline',
      recepcionista: 'headset-outline',
      veterinario:   'medkit-outline',
      cliente:       'person-add-outline'
    };
    return icons[this.role] || 'person-add-outline';
  }

  getRoleLabel(): string {
    const labels: any = {
      administrador: 'Administrador',
      recepcionista: 'Recepcionista',
      veterinario:   'Veterinario',
      cliente:       'Cliente'
    };
    return labels[this.role] || 'Usuario';
  }

  async submit() {
    if (this.modoEdicion) {
      await this.guardarEdicion();
    } else {
      await this.register();
    }
  }

async guardarEdicion() {

  this.guardando = true;

  try {

    // Validaciones
    const telefonoValido = await this.validarTelefono();

    if (!telefonoValido) {
      this.guardando = false;
      return;
    }

    const correoValido = await this.validarCorreo();

    if (!correoValido) {
      this.guardando = false;
      return;
    }

    const coleccion =
      this.userService.getColeccionPorRol(this.role);

    // Datos originales
    const datosOriginales =
      await this.userService.getDocumentOnce(
        coleccion,
        this.uidEditar
      );

    // Cambios
    const cambios: any = {
      Nombre: this.user.Nombre,
      Apellido: this.user.Apellido,
      Telefono: this.user.Telefono,
      Correo: this.user.Correo,
    };

    if (this.role === 'veterinario') {
      cambios['Especialidad'] = this.user.Especialidad;
    }

    // ✅ Verificar si hubo cambios
    const sinCambios =
      cambios.Nombre === datosOriginales?.Nombre &&
      cambios.Apellido === datosOriginales?.Apellido &&
      cambios.Telefono === datosOriginales?.Telefono &&
      cambios.Correo === datosOriginales?.Correo &&
      (
        this.role !== 'veterinario' ||
        cambios.Especialidad === datosOriginales?.Especialidad
      );

    if (sinCambios) {

      await this.mostrarToast(
        'No se realizaron cambios.',
        'warning'
      );

      this.guardando = false;
      return;
    }

    // ✅ Guardar
    await this.userService.actualizarUsuario(
      coleccion,
      this.uidEditar,
      cambios
    );

    await this.mostrarToast(
      'Cambios guardados correctamente',
      'success'
    );

    this.cerrarModal(true);

  } catch (err: any) {

    await this.mostrarToast(
      err?.message || 'Error al guardar cambios',
      'danger'
    );

  } finally {

    this.guardando = false;

  }
}

  async register() {
    if (this.registrando) return;

    if (!this.user.Nombre || !this.user.Apellido || !this.user.Correo || !this.user.Contrasena) {
      await this.mostrarToast('Por favor completa todos los campos obligatorios.', 'warning');
      return;
    }

    this.registrando = true;
    try {
          if (this.role !== 'cliente' && this.user.Cedula) {

      const cedulaExiste = await this.userService.existeCedula(this.user.Cedula);

      if (cedulaExiste) {
        await this.mostrarToast(
          'Ya existe un usuario registrado con esa cédula.',
          'warning'
        );

        this.registrando = false;
        return;
      }
    }
        // Validar teléfono
    const telefonoValido = await this.validarTelefono();

    if (!telefonoValido) {
      this.registrando = false;
      return;
    }

    const correoValido = await this.validarCorreo();

    if (!correoValido) {
      this.registrando = false;
      return;
    }
      switch (this.role) {
        case 'administrador': await this.userService.registerAdministrador(this.user); break;
        case 'cliente':       await this.userService.registerCliente(this.user);       break;
        case 'recepcionista': await this.userService.registerRecepcionista(this.user); break;
        case 'veterinario':   await this.userService.registerVeterinario(this.user);   break;
      }
      await this.mostrarToast(`${this.getRoleLabel()} registrado correctamente`, 'success');
      this.cerrarModal(true); 
        } catch (err: any) {

      if (err?.code === 'auth/email-already-in-use') {

        await this.mostrarToast(
          'Ese correo ya está registrado.',
          'warning'
        );

      } else {

        await this.mostrarToast(
          err?.message || 'Error al registrar usuario',
          'danger'
        );

      }

    } finally {
      this.registrando = false;
    }
  }

  private async mostrarToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle-outline' :
            color === 'warning' ? 'alert-outline' : 'close-circle-outline'
    });
    await toast.present();
  }

async soloNumerosTelefono(event: any) {

  let valor = event.target.value;

  // Detectar si escribió letras
  const teniaLetras = /[^0-9]/g.test(valor);

  // Limpiar caracteres no válidos
  valor = valor.replace(/[^0-9]/g, '');

  // Máximo 15 caracteres
  valor = valor.substring(0, 15);

  this.user.Telefono = valor;

  // Mostrar aviso
  if (teniaLetras) {
    await this.mostrarToast(
      'El teléfono solo puede contener números.',
      'warning'
    );
  }
}

private async validarTelefono(): Promise<boolean> {

  if (!this.user.Telefono) {
    return true;
  }

  if (!/^[0-9]+$/.test(this.user.Telefono)) {

    await this.mostrarToast(
      'El teléfono solo puede contener números.',
      'warning'
    );

    return false;
  }

  if (
    this.user.Telefono.length < 7 ||
    this.user.Telefono.length > 15
  ) {

    await this.mostrarToast(
      'El teléfono debe tener entre 7 y 15 números.',
      'warning'
    );

    return false;
  }

  return true;
}

async soloLetras(event: any, campo: 'Nombre' | 'Apellido') {

  let valor = event.target.value;

  // Detectar caracteres inválidos
  const teniaInvalidos = /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g.test(valor);

  // Limpiar todo excepto letras y espacios
  valor = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');

  // Evitar espacios dobles
  valor = valor.replace(/\s+/g, ' ');

  // Actualizar modelo
  this.user[campo] = valor;

  // Mostrar aviso
  if (teniaInvalidos) {
    await this.mostrarToast(
      `${campo} solo puede contener letras.`,
      'warning'
    );
  }
} 

private async validarCorreo(): Promise<boolean> {

  if (!this.correoValido(this.user.Correo)) {

    await this.mostrarToast(
      'El correo parece estar mal escrito o tiene un dominio no válido.',
      'warning'
    );

    return false;
  }

  return true;
}

private correoValido(correo: string): boolean {

  const regex =
    /^[a-zA-Z0-9._%+-]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|icloud\.com)$/;

  return regex.test(correo.toLowerCase());
}

}