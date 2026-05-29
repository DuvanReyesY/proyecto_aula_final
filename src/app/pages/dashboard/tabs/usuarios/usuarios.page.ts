import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { UserService } from 'src/app/core/services/user.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from '@angular/router';
import { PrivilegiosModalComponent } from 'src/app/shared/components/privilegios-modal/privilegios-modal.component';
import { RegisterPage } from 'src/app/pages/register/register.page';

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

  constructor(
    private userService: UserService,
    public authService: AuthService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,   // ✅
    private toastCtrl: ToastController,   // ✅
    private router: Router
  ) {}

  ngOnInit() {
    this.rolActual = this.authService.getRolActual() ?? '';
    this.cargarUsuarios();
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

  filtrar() {
    let lista = [...this.usuarios];

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
}