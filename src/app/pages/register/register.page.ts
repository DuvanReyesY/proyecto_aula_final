import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { UserService } from 'src/app/core/services/user.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
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
    private toastCtrl: ToastController   // ✅
  ) {}

  async ngOnInit() {
    this.rolActual = this.authService.getRolActual() ?? '';
    this.user.idAdministrador = this.authService.getUidActual() ?? '';

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
      const coleccion = this.userService.getColeccionPorRol(this.role);
      const cambios: any = {
        Nombre:   this.user.Nombre,
        Apellido: this.user.Apellido,
        Telefono: this.user.Telefono,
      };
      if (this.role === 'veterinario') cambios['Especialidad'] = this.user.Especialidad;

      await this.userService.actualizarUsuario(coleccion, this.uidEditar, cambios);
      await this.mostrarToast('Cambios guardados correctamente', 'success');
      this.router.navigate(['/layout/usuarios']);
    } catch (err: any) {
      await this.mostrarToast(err?.message || 'Error al guardar cambios', 'danger');
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
      switch (this.role) {
        case 'administrador': await this.userService.registerAdministrador(this.user); break;
        case 'cliente':       await this.userService.registerCliente(this.user);       break;
        case 'recepcionista': await this.userService.registerRecepcionista(this.user); break;
        case 'veterinario':   await this.userService.registerVeterinario(this.user);   break;
      }
      await this.mostrarToast(`${this.getRoleLabel()} registrado correctamente`, 'success');
      this.router.navigate(['/layout/usuarios']);
    } catch (err: any) {
      await this.mostrarToast(err?.message || 'Error al registrar usuario', 'danger');
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
}