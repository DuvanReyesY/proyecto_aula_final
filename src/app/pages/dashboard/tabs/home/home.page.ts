import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import { Firestore, collection, getCountFromServer } from '@angular/fire/firestore';
import { PrivilegiosService } from 'src/app/core/services/privilegios.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  rol: string = '';
  uid: string = '';
  nombreUsuario: string = '';

  totalClientes: number = 0;
  totalMascotas: number = 0;
  totalVeterinarios: number = 0;
  totalRecepcionistas: number = 0;

  privilegios: any = {};
  cargando: boolean = true;

  fechaHoy: string = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  get subtituloHero(): string {
    const map: any = {
      administrador: 'Panel de administración completo',
      recepcionista: 'Gestión de clientes y citas',
      veterinario:   'Tus citas y pacientes del día',
      cliente:       'Revisa tus mascotas y citas',
    };
    return map[this.rol] ?? '';
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private firestore: Firestore,
    private privilegiosService: PrivilegiosService
  ) {}

  async ngOnInit() {
    this.rol = this.authService.getRolActual() ?? '';
    this.uid = this.authService.getUidActual() ?? '';

    // ✅ Nombre real desde Firestore
    const coleccion = this.userService.getColeccionPorRol(this.rol);
    const userData  = await this.userService.getDocumentOnce(coleccion, this.uid);
    this.nombreUsuario = userData?.Nombre ?? 'Usuario';

    // ✅ UID correcto
    if (this.rol === 'recepcionista' || this.rol === 'veterinario') {
      this.privilegiosService.getPrivilegios(this.uid).subscribe(p => {
        this.privilegios = p ?? {};
      });
    }

    await this.cargarDatos();
    this.cargando = false;
  }

  async cargarDatos() {
    if (this.rol === 'administrador') {
      const [c, m, v, r] = await Promise.all([
        getCountFromServer(collection(this.firestore, 'clientes')),
        getCountFromServer(collection(this.firestore, 'mascotas')),
        getCountFromServer(collection(this.firestore, 'veterinarios')),
        getCountFromServer(collection(this.firestore, 'recepcionistas')),
      ]);
      this.totalClientes       = c.data().count;
      this.totalMascotas       = m.data().count;
      this.totalVeterinarios   = v.data().count;
      this.totalRecepcionistas = r.data().count;
    }
    if (this.rol === 'recepcionista') {
      const [c, m] = await Promise.all([
        getCountFromServer(collection(this.firestore, 'clientes')),
        getCountFromServer(collection(this.firestore, 'mascotas')),
      ]);
      this.totalClientes = c.data().count;
      this.totalMascotas = m.data().count;
    }
    if (this.rol === 'veterinario') {
      const m = await getCountFromServer(collection(this.firestore, 'mascotas'));
      this.totalMascotas = m.data().count;
    }
  }
  get tituloHero(): string {
  const map: any = {
    administrador: 'Panel de\nAdministración',
    recepcionista: 'Panel de\nRecepción',
    veterinario:   'Panel\nVeterinario',
    cliente:       'Mi Panel',
  };
  return map[this.rol] ?? 'Bienvenido';
}
}