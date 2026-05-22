import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { MascotaService, Mascota } from '../../../../core/services/mascota.service';
import { CitaService, Cita } from '../../../../core/services/cita.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-cliente-home',
  templateUrl: './cliente-home.page.html',
  styleUrls: ['./cliente-home.page.scss'],
  standalone: false
})
export class ClienteHomePage implements OnInit {
  private authService    = inject(AuthService);
  private mascotaService = inject(MascotaService);
  private citaService    = inject(CitaService);
  private userService    = inject(UserService);
  private router         = inject(Router);

  nombreCliente = '';
  uid           = '';

  mascotas$: Observable<Mascota[]> | null = null;
  ultimasCitas$: Observable<Cita[]> | null = null;

  ngOnInit(): void {
    this.uid = this.authService.getUidActual() ?? '';

    this.userService.getDocumentOnce('clientes', this.uid).then((data) => {
      if (data) this.nombreCliente = data['Nombre'] ?? '';
    });

    this.mascotas$ = this.mascotaService.getMascotasPorCliente(this.uid);

    this.ultimasCitas$ = this.citaService.getTodas().pipe(
      map((citas) =>
        citas
          .filter((c) => c.idCliente === this.uid)
          .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro))
          .slice(0, 3)
      )
    );
  }

  agregarMascota(): void {
    this.router.navigate(['/registro-mascota']);
  }

  calcularEdad(fechaNacimiento: string): string {
    if (!fechaNacimiento) return '';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    const anios = hoy.getFullYear() - nac.getFullYear();
    const meses = hoy.getMonth() - nac.getMonth();
    const ajuste = meses < 0 || (meses === 0 && hoy.getDate() < nac.getDate()) ? 1 : 0;
    const edad = anios - ajuste;
    return edad <= 0 ? 'Menos de 1 año' : edad === 1 ? '1 año' : `${edad} años`;
  }

  emojiEspecie(especie: string): string {
    const map: Record<string, string> = {
      perro: '🐕', gato: '🐱', ave: '🦜', reptil: '🦎', otro: '🐾',
    };
    return map[especie?.toLowerCase()] ?? '🐾';
  }

  badgeClass(estado: Cita['estado']): string {
    return `badge badge--${estado}`;
  }

  estadoTexto(estado: Cita['estado']): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      cancelada: 'Cancelada',
      finalizada: 'Finalizada',
    };
    return map[estado] ?? estado;
  }

  formatearFecha(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

mascotaSeleccionada: Mascota | null = null;

verDetalleMascota(mascota: Mascota) {
  this.mascotaSeleccionada = mascota;
}

}
