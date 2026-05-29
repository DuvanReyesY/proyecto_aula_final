import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { UserService } from 'src/app/core/services/user.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from '@angular/router';
import { PrivilegiosModalComponent } from 'src/app/shared/components/privilegios-modal/privilegios-modal.component';
import { RegisterPage } from 'src/app/pages/register/register.page';
import { Subscription } from 'rxjs';
import { Auth, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from '@angular/fire/auth';
import { inject } from '@angular/core';
import { HorarioVeterinarioComponent } from 'src/app/shared/components/horario-veterinario/horario-veterinario.component';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false
})
export class UsuariosPage implements OnInit {
  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  rolActual: string = '';
  filtroBusqueda: string = '';
  filtroRol: string = 'todos';
  cargando: boolean = true;

  supervisores: { [uid: string]: string } = {};

  privilegios: any = {};
  private privSub!: Subscription;

  constructor(
    private userService: UserService,
    public authService: AuthService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,   
    private toastCtrl: ToastController,   
    private router: Router
  ) {}

ngOnInit() {
  this.rolActual = this.authService.getRolActual() ?? '';

  this.privSub = this.authService.privilegios$.subscribe(p => {
    this.privilegios = p;
    this.filtrar(); // ← una sola función que hace todo
  });

  this.cargarUsuarios();
}

filtrar() {
  let lista = [...this.usuarios];

  // Restricción por rol
  if (this.rolActual !== 'administrador' && !this.privilegios['verUsuarios']) {
    lista = lista.filter(u => u.rol === 'cliente');
  }

  if (this.filtroRol !== 'todos') {
    lista = lista.filter(u => u.rol === this.filtroRol);
  }

  if (this.filtroBusqueda.trim()) {
    const busq = this.filtroBusqueda.toLowerCase();
    lista = lista.filter(u =>
      u.Nombre?.toLowerCase().includes(busq) ||
      u.Apellido?.toLowerCase().includes(busq) ||
      u.Correo?.toLowerCase().includes(busq) ||
      u.Cedula?.toLowerCase().includes(busq)
    );
  }

  this.usuariosFiltrados = lista;
}

  ngOnDestroy() {
  this.privSub?.unsubscribe();
  }

  async abrirHorarios(usuario: any) {
  const modal = await this.modalCtrl.create({
    component: HorarioVeterinarioComponent,
    componentProps: { uid: usuario.uid },
    breakpoints: [0, 1],
    initialBreakpoint: 1,
  });
  await modal.present();
}

  cargarUsuarios() {
    this.userService.getTodosLosUsuarios().subscribe(async usuarios => {
      this.usuarios = usuarios;
      await this.resolverSupervisores(usuarios);
      this.filtrar();
      this.cargando = false;
    });
  }

  async resolverSupervisores(usuarios: any[]) {
    const uidsUnicos = new Set<string>();
    usuarios.forEach(u => { if (u.idAdministrador) uidsUnicos.add(u.idAdministrador); });

    const promesas = Array.from(uidsUnicos).map(async uid => {
      if (this.supervisores[uid]) return;
      try {
        const snap: any = await this.userService.getDocumentOnce('administradores', uid);
        if (snap) this.supervisores[uid] = `${snap['Nombre'] ?? ''} ${snap['Apellido'] ?? ''}`.trim();
      } catch {
        this.supervisores[uid] = 'Desconocido';
      }
    });

    await Promise.all(promesas);
  }

  getNombreSupervisor(uid: string): string {
    if (!uid) return '—';
    return this.supervisores[uid] || 'Cargando...';
  }



  // ✅ Ahora con confirmación y toast
  async cambiarEstado(usuario: any) {
    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
    const accion      = nuevoEstado === 'inactivo' ? 'pausar' : 'activar';

    const alert = await this.alertCtrl.create({
      header: '¿Confirmar acción?',
      message: `¿Deseas ${accion} a ${usuario.Nombre} ${usuario.Apellido}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: accion.charAt(0).toUpperCase() + accion.slice(1),
          handler: async () => {
            try {
              const coleccion = this.userService.getColeccionPorRol(usuario.rol);
              await this.userService.cambiarEstado(coleccion, usuario.uid, nuevoEstado);
              usuario.estado = nuevoEstado;
              await this.mostrarToast(
                `${usuario.Nombre} ${nuevoEstado === 'activo' ? 'activado' : 'pausado'} correctamente`,
                'success'
              );
            } catch {
              await this.mostrarToast('Error al cambiar el estado', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async abrirPermisos(usuario: any) {
    const modal = await this.modalCtrl.create({
      component: PrivilegiosModalComponent,
      componentProps: { usuario },
      cssClass: 'permisos-modal'
    });
    await modal.present();
  }

async nuevoUsuario() {
  const modal = await this.modalCtrl.create({
    component: RegisterPage,
    componentProps: { modoEdicionInput: false },
    breakpoints: [0, 1],
    initialBreakpoint: 1,
  });
  await modal.present();
  const { data } = await modal.onWillDismiss();
  if (data?.guardado) {
    this.mostrarToast('Usuario registrado exitosamente', 'success');
  }
}

async editarUsuario(usuario: any) {
  const modal = await this.modalCtrl.create({
    component: RegisterPage,
    componentProps: {
      modoEdicionInput: true,
      uidEditarInput:   usuario.uid,
      rolInput:         usuario.rol,
    },
    breakpoints: [0, 1],
    initialBreakpoint: 1,
  });
  await modal.present();
  const { data } = await modal.onWillDismiss();
  if (data?.guardado) {
    this.mostrarToast('Usuario actualizado correctamente', 'success');
  }
}

  getBadgeColor(rol: string): string {
    const map: any = {
      administrador: 'success',
      veterinario:   'primary',
      recepcionista: 'warning',
      cliente:       'medium'
    };
    return map[rol] || 'medium';
  }

  // ✅ Helper toast reutilizable
  private async mostrarToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'
    });
    await toast.present();
  }

  filtrarVer() {
  let lista = [...this.usuarios];

  // ← si no es admin y verUsuarios es false, solo ve clientes
  if (this.rolActual !== 'administrador' && !this.privilegios['verUsuarios']) {
    lista = lista.filter(u => u.rol === 'cliente');
  }

  if (this.filtroRol !== 'todos') {
    lista = lista.filter(u => u.rol === this.filtroRol);
  }

  if (this.filtroBusqueda.trim()) {
    const busq = this.filtroBusqueda.toLowerCase();
    lista = lista.filter(u =>
      u.Nombre?.toLowerCase().includes(busq) ||
      u.Apellido?.toLowerCase().includes(busq) ||
      u.Correo?.toLowerCase().includes(busq) ||
      u.Cedula?.toLowerCase().includes(busq)
    );
  }

  this.usuariosFiltrados = lista;
}

puedeEditarUsuario(usuario: any): boolean {

  // No puede editarse a sí mismo
  if (usuario.uid === this.authService.getUidActual()) {
    return false;
  }

  // Admin puede todo
  if (this.rolActual === 'administrador') {
    return true;
  }

  // Debe tener privilegio
  if (!this.privilegios['editarUsuarios']) {
    return false;
  }

  // Recepcionista solo clientes
  if (
    this.rolActual === 'recepcionista' &&
    usuario.rol !== 'cliente'
  ) {
    return false;
  }

  return true;
}

async validarEdicion(usuario: any) {

  if (!this.puedeEditarUsuario(usuario)) {

    await this.mostrarToast(
      'No tienes permisos para editar este usuario.',
      'warning'
    );

    return;
  }

  this.editarUsuario(usuario);
}

private auth = inject(Auth);

async resetearContrasena(usuario: any, event: Event) {
  event.stopPropagation();

  const alert = await this.alertCtrl.create({
    header: 'Confirmar identidad',
    message: `Se enviará un enlace de restablecimiento a ${usuario.Correo}. Ingresa tu contraseña para continuar.`,
    inputs: [
      {
        name: 'password',
        type: 'password',
        placeholder: 'Tu contraseña de administrador',
      }
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Enviar enlace',
        handler: async (data) => {
          if (!data.password) {
            await this.mostrarToast('Ingresa tu contraseña', 'warning');
            return false;
          }

          try {
            // Reautenticar al admin
            const adminUser = this.auth.currentUser;
            if (!adminUser?.email) throw new Error('Sin sesión');

            const credencial = EmailAuthProvider.credential(adminUser.email, data.password);
            await reauthenticateWithCredential(adminUser, credencial);

            // Enviar email de reseteo al usuario seleccionado
            await sendPasswordResetEmail(this.auth, usuario.Correo);

            await this.mostrarToast(
              `Enlace enviado a ${usuario.Correo}`,
              'success'
            );
          } catch (err: any) {
            const msg = err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
              ? 'Contraseña de administrador incorrecta'
              : 'Error al enviar el enlace';
            await this.mostrarToast(msg, 'danger');
            return false;
          }
          return true;
        }
      }
    ]
  });

  await alert.present();
}

}