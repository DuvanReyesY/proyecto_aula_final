import { Component, OnInit, inject } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { UserService } from 'src/app/core/services/user.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-cliente-selector',
  templateUrl: './cliente-selector.component.html',
  styleUrls: ['./cliente-selector.component.scss'],
  standalone: false
})
export class ClienteSelectorComponent implements OnInit {
  clientes:  any[] = [];
  filtrados: any[] = [];
  busqueda = '';
  cargando = true;

  private popoverCtrl = inject(PopoverController);
  private userSvc     = inject(UserService);

  async ngOnInit() {
    try {
      const todos = await firstValueFrom(this.userSvc.getTodosLosUsuarios());
      this.clientes  = todos.filter(u => u.rol === 'cliente');
      this.filtrados = [...this.clientes];
    } finally {
      this.cargando = false;
    }
  }

  filtrar() {
    const texto = this.busqueda.toLowerCase().trim();
    if (!texto) {
      this.filtrados = [...this.clientes];
      return;
    }
    this.filtrados = this.clientes.filter(c =>
      c.Nombre?.toLowerCase().includes(texto)    ||
      c.Apellido?.toLowerCase().includes(texto)  ||
      c.Correo?.toLowerCase().includes(texto)    ||
      c.Telefono?.includes(texto)
    );
  }

  seleccionar(cliente: any) {
    this.popoverCtrl.dismiss({ cliente });
  }
}