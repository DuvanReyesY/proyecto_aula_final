import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  docData,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

export interface Diagnostico {
  idCita:              string;
  idVeterinario:       string;
  nombreVeterinario:   string;
  idMascota:           string;
  nombreMascota:       string;
  idCliente:           string;
  sintomas:            string;
  diagnostico:         string;
  tratamiento:         string;
  medicamentos:        string;
  observaciones:       string;
  fechaDiagnostico:    string;   // ISO string
  fechaActualizacion:  string;
}

@Injectable({ providedIn: 'root' })
export class DiagnosticoService {

  private firestore = inject(Firestore);

  // Subcolección: citas/{idCita}/diagnosticos/diagnostico
  // Un solo doc por cita con ID fijo "diagnostico"
  private ref(idCita: string) {
    return doc(this.firestore, `citas/${idCita}/diagnosticos/diagnostico`);
  }

  // Guarda o sobreescribe el diagnóstico de una cita
  async guardar(diagnostico: Diagnostico): Promise<void> {
    await setDoc(this.ref(diagnostico.idCita), {
      ...diagnostico,
      fechaActualizacion: new Date().toISOString(),
    });
  }

  // Lectura reactiva (Observable) — para mostrar en el modal
  getByIdCita(idCita: string): Observable<Diagnostico | undefined> {
    return docData(this.ref(idCita)) as Observable<Diagnostico | undefined>;
  }

  // Lectura única — para verificar si ya existe antes de abrir el modal
  async getOnce(idCita: string): Promise<Diagnostico | null> {
    const snap = await getDoc(this.ref(idCita));
    return snap.exists() ? (snap.data() as Diagnostico) : null;
  }

  async actualizar(idCita: string, cambios: Partial<Diagnostico>): Promise<void> {
    await updateDoc(this.ref(idCita), {
      ...cambios,
      fechaActualizacion: new Date().toISOString(),
    });
  }
}
