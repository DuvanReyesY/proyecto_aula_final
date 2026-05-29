import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { UserService, PerfilUsuario } from 'src/app/core/services/user.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.page.html',
  styleUrls:  ['./configuracion.page.scss'],
  standalone: false,
})
export class ConfiguracionPage implements OnInit {

  cargando      = signal(true);
  guardandoPerfil = signal(false);
  guardandoPass   = signal(false);
  mostrarPass     = signal(false);

  perfil: PerfilUsuario | null = null;

  // form datos personales
  editNombre      = '';
  editApellido    = '';
  editTelefono    = '';
  editEspecialidad = '';

  // form contraseña
  passActual   = '';
  passNueva    = '';
  passConfirmar = '';

  constructor(
    private userSvc:   UserService,
    private authSvc:   AuthService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
  ) {}

  async ngOnInit() {
    this.cargando.set(true);
    this.userSvc.getPerfilActual().subscribe(p => {
      this.perfil       = p;
      this.editNombre   = p?.Nombre       ?? '';
      this.editApellido = p?.Apellido     ?? '';
      this.editTelefono = p?.Telefono     ?? '';
      this.editEspecialidad = p?.Especialidad ?? '';
      this.cargando.set(false);
    });
  }

  get iniciales(): string {
    return `${this.perfil?.Nombre?.[0] ?? ''}${this.perfil?.Apellido?.[0] ?? ''}`.toUpperCase();
  }

  get rolLabel(): string {
    const map: Record<string, string> = {
      administrador: 'Administrador',
      recepcionista: 'Recepcionista',
      veterinario:   'Veterinario',
      cliente:       'Cliente',
    };
    return map[this.perfil?.rol ?? ''] ?? '';
  }

  get datosModificados(): boolean {
    return this.editNombre      !== this.perfil?.Nombre       ||
           this.editApellido    !== this.perfil?.Apellido     ||
           this.editTelefono    !== this.perfil?.Telefono     ||
           this.editEspecialidad !== (this.perfil?.Especialidad ?? '');
  }

  get passValida(): boolean {
    return this.passActual.length >= 6 &&
           this.passNueva.length  >= 6 &&
           this.passNueva === this.passConfirmar;
  }

  get passNoCoinciden(): boolean {
    return this.passConfirmar.length > 0 && this.passNueva !== this.passConfirmar;
  }

  async guardarPerfil() {
    if (!this.datosModificados) return;
    this.guardandoPerfil.set(true);
    try {
      await this.userSvc.actualizarPerfilActual({
        Nombre:       this.editNombre,
        Apellido:     this.editApellido,
        Telefono:     this.editTelefono,
        Especialidad: this.editEspecialidad,
      });
      await this.toast('Perfil actualizado correctamente', 'success');
    } catch {
      await this.toast('Error al guardar los cambios', 'danger');
    } finally {
      this.guardandoPerfil.set(false);
    }
  }

  async cambiarPassword() {
    if (!this.passValida) return;
    this.guardandoPass.set(true);
    try {
      await this.userSvc.cambiarPasswordActual(this.passActual, this.passNueva);
      this.passActual = this.passNueva = this.passConfirmar = '';
      await this.toast('Contraseña actualizada', 'success');
    } catch (err: any) {
      const msg = err?.code === 'auth/wrong-password'
        ? 'La contraseña actual es incorrecta'
        : 'No se pudo actualizar la contraseña';
      await this.toast(msg, 'danger');
    } finally {
      this.guardandoPass.set(false);
    }
  }

  cerrarSesion() {
    this.authSvc.logout();
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning') {
    const t = await this.toastCtrl.create({
      message, color, duration: 2500, position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle-outline' : 'close-circle-outline',
    });
    await t.present();
  }
}