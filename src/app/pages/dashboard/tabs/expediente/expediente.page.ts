import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { MascotaService, Mascota } from 'src/app/core/services/mascota.service';
import { CitaService, Cita } from 'src/app/core/services/cita.service';
import { DiagnosticoService, Diagnostico } from 'src/app/core/services/diagnostico.service';
import { UserService } from 'src/app/core/services/user.service';
import { ToastController, LoadingController } from '@ionic/angular';

import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Forzamos el tipo 'any' para evitar los errores de indexación estricta de TypeScript
const pdfMakeX = pdfMake as any;
const pdfFontsX = pdfFonts as any;
pdfMakeX.vfs = pdfFontsX.pdfMake ? pdfFontsX.pdfMake.vfs : pdfFontsX.vfs;

@Component({
  selector: 'app-expediente',
  templateUrl: './expediente.page.html',
  styleUrls: ['./expediente.page.scss'],
  standalone: false
})
export class ExpedientePage implements OnInit {
  idCliente: string = '';
  idMascota: string = '';
  mascota: Mascota | null = null;
  
  citasPasadas: Cita[] = [];
  citasProximas: Cita[] = [];
  citaSeleccionada: Cita | null = null;
  diagnosticoSeleccionado: Diagnostico | null = null;

  rolActual = '';
  uidActual = '';
  editandoAntecedentes = false;
  usuarioActual: any = null;

  cargando: boolean = true;
  // Objeto para enlazar con el formulario
  antecedentesForm = {
    alergias: '',
    cirugias: '',
    enfermedadesCr: '',
    esquemaVacunacion: '',
    dieta: ''
  };

  private route = inject(ActivatedRoute);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);
  private mascotaSvc = inject(MascotaService);
  private citaSvc = inject(CitaService);
  private diagnosticoSvc = inject(DiagnosticoService);
  private userSvc = inject(UserService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  async ngOnInit() {
    this.idCliente = this.route.snapshot.paramMap.get('idCliente') || '';
    this.idMascota = this.route.snapshot.paramMap.get('idMascota') || '';
    
    await this.determinarRol();
    this.cargarMascota();
    this.cargarCitas();
  }

  private determinarRol(): Promise<void> {
    return new Promise((resolve) => {
      // onAuthStateChanged espera a que Firebase inicialice la sesión real
      const unsubscribe = onAuthStateChanged(this.auth, async (user) => {
        unsubscribe(); // Nos desuscribimos para que solo se ejecute una vez
        
        if (!user) {
          resolve();
          return;
        }

        this.uidActual = user.uid;
        const roles = ['administradores', 'recepcionistas', 'veterinarios'];
        const rolMap: Record<string, string> = {
          administradores: 'administrador',
          recepcionistas:  'recepcionista',
          veterinarios:    'veterinario'
        };

        for (const coleccion of roles) {
          const data = await this.userSvc.getDocumentOnce(coleccion, user.uid);
          if (data) {
            this.rolActual = rolMap[coleccion];
            this.usuarioActual = data;
            break;
          }
        }
        
        this.cdr.detectChanges(); // Obligamos a Angular a mostrar la tarjeta del perfil
        resolve(); // Avisamos al ngOnInit que ya puede seguir cargando las citas
      });
    });
  }

  private cargarMascota() {
    this.mascotaSvc.getTodas().subscribe(mascotas => {
      this.mascota = mascotas.find(m => m.idMascota === this.idMascota) || null;
      if (this.mascota && this.mascota.antecedentes) {
        this.antecedentesForm = {
          alergias: this.mascota.antecedentes.alergias || '',
          cirugias: this.mascota.antecedentes.cirugias || '',
          enfermedadesCr: this.mascota.antecedentes.enfermedadesCr || '',
          esquemaVacunacion: this.mascota.antecedentes.esquemaVacunacion || '',
          dieta: this.mascota.antecedentes.dieta || ''
        };
      }
      this.cdr.detectChanges();
    });
  }

  private cargarCitas() {
    this.citaSvc.getCitasPorMascota(this.idMascota).subscribe(citas => {
      const ahora = new Date();
      const fechaHoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
      
      // 1. Separar citas pasadas/finalizadas de las próximas
      let pasadas = citas.filter(c => c.estado === 'finalizada' || c.estado === 'no_asistio' || c.fecha < fechaHoy);
      let proximas = citas.filter(c => (c.estado === 'pendiente' || c.estado === 'en_proceso') && c.fecha >= fechaHoy);

      // 2. FILTRADO ESTRICTO POR VETERINARIO (Si es admin, no entra aquí y ve todo)
      if (this.rolActual === 'veterinario') {
        pasadas = pasadas.filter(c => c.idVeterinario === this.uidActual);
        proximas = proximas.filter(c => c.idVeterinario === this.uidActual);
      }
      
      // 3. Ordenar cronológicamente
      this.citasPasadas = pasadas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      this.citasProximas = proximas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  async seleccionarCita(cita: Cita) {
    this.citaSeleccionada = cita;
    this.diagnosticoSeleccionado = null;
    
    if (cita.estado === 'finalizada') {
      this.diagnosticoSeleccionado = await this.diagnosticoSvc.getOnce(cita.idCita);
    }
  }

  async guardarAntecedentes() {
    if (!this.mascota) return;
    const loading = await this.loadingCtrl.create({ message: 'Guardando antecedentes...' });
    await loading.present();

    try {
      await this.mascotaSvc.actualizarMascota(this.idCliente, this.idMascota, {
        antecedentes: this.antecedentesForm
      });
      this.editandoAntecedentes = false;
      this.mostrarToast('Antecedentes actualizados', 'success');
    } catch (e) {
      this.mostrarToast('Error al guardar antecedentes', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  generarPDF() {
    if (!this.citaSeleccionada || !this.mascota) return;

    const diag = this.diagnosticoSeleccionado;
    
    const docDefinition: any = {
      content: [
        { text: 'Reporte Médico Veterinario', style: 'header' },
        { text: `Fecha de Consulta: ${this.citaSeleccionada.fecha}`, style: 'subheader' },
        { text: `Atendido por: Dr/Dra. ${this.citaSeleccionada.nombreVeterinario}`, style: 'subheader' },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }] },
        
        { text: '\nDatos del Paciente', style: 'sectionHeader' },
        {
          columns: [
            { text: `Nombre: ${this.mascota.nombre}`, width: '*' },
            { text: `Especie/Raza: ${this.mascota.especie} - ${this.mascota.raza}`, width: '*' },
            { text: `Sexo: ${this.mascota.sexo}`, width: '*' }
          ]
        },
        
        { text: '\nAntecedentes Importantes', style: 'sectionHeader' },
        { text: `Alergias: ${this.antecedentesForm.alergias || 'Ninguna'}` },
        { text: `Enfermedades: ${this.antecedentesForm.enfermedadesCr || 'Ninguna'}` },

        { canvas: [{ type: 'line', x1: 0, y1: 15, x2: 515, y2: 15, lineWidth: 1, lineColor: '#cccccc' }] },

        { text: '\nDetalles de la Consulta', style: 'sectionHeader' },
        { text: 'Motivo / Síntomas:', bold: true, margin: [0, 5, 0, 2] },
        { text: diag?.sintomas || 'No registrado' },
        
        { text: 'Diagnóstico:', bold: true, margin: [0, 10, 0, 2] },
        { text: diag?.diagnostico || 'No registrado' },
        
        { text: 'Tratamiento y Medicamentos:', bold: true, margin: [0, 10, 0, 2] },
        { text: `${diag?.tratamiento || ''}\n${diag?.medicamentos || ''}`.trim() || 'No registrado' },

        { text: 'Observaciones:', bold: true, margin: [0, 10, 0, 2] },
        { text: diag?.observaciones || 'Ninguna' }
      ],
      styles: {
        header: { fontSize: 20, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
        subheader: { fontSize: 12, alignment: 'center', margin: [0, 0, 0, 5] },
        sectionHeader: { fontSize: 14, bold: true, color: '#3880ff', margin: [0, 10, 0, 5] }
      }
    };

    pdfMake.createPdf(docDefinition).download(`Reporte_${this.mascota.nombre}_${this.citaSeleccionada.fecha}.pdf`);
  }

  private async mostrarToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({ message, color, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}