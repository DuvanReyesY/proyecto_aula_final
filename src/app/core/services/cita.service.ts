// src/app/core/services/cita.service.ts

import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  CollectionReference,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, take } from 'rxjs';

export interface Cita {
  idCita:              string;
  idMascota:           string;
  nombreMascota:       string;
  idCliente:           string;
  nombreCliente:       string;
  idVeterinario:       string;
  nombreVeterinario:   string;
  idRecepcionista:     string;
  nombreRecepcionista: string;
  fecha:               string;  // "2026-05-10"
  horaInicio:          string;  // "09:00"
  horaFin:             string;  // "09:30"
  tipo:                string;
  estado: 'pendiente' | 'en_proceso' | 'finalizada' | 'cancelada' | 'no_asistio';
  notas:               string;
  fechaRegistro:       string;
}

@Injectable({ providedIn: 'root' })
export class CitaService {

  private col = 'citas';
  private citasRef: CollectionReference;
  private actualizando = false; // guard anti-loop

  constructor(private firestore: Firestore) {
    this.citasRef = collection(this.firestore, this.col);

    // Solo revisa no_asistio cada 5 min, sin loop
    setInterval(() => this.revisarVencidas(), 5 * 60 * 1000);
  }

  // ── Lectura ──────────────────────────────────────────────────────

  getTodas(): Observable<Cita[]> {
    return new Observable(observer => {
      const unsub = onSnapshot(this.citasRef, snapshot => {
        const citas = snapshot.docs.map(d => ({
          idCita: d.id,
          ...d.data()
        } as Cita));
        observer.next(citas);
      });
      return () => unsub();
    });
  }

  // Solo las citas donde idVeterinario coincide — para la vista del veterinario
  getPorVeterinario(idVeterinario: string): Observable<Cita[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, this.col),
        where('idVeterinario', '==', idVeterinario)
      );
      const unsub = onSnapshot(q, snapshot => {
        const citas = snapshot.docs.map(d => ({
          idCita: d.id,
          ...d.data()
        } as Cita));
        observer.next(citas);
      });
      return () => unsub();
    });
  }

  getCitasPorMascota(idMascota: string): Observable<Cita[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, this.col),
        where('idMascota', '==', idMascota)
      );
      const unsub = onSnapshot(q, snapshot => {
        const citas = snapshot.docs.map(d => ({ idCita: d.id, ...d.data() } as Cita));
        observer.next(citas);
      });
      return () => unsub();
    });
  }

  // ── Escritura ────────────────────────────────────────────────────

  async crearCita(cita: Omit<Cita, 'idCita'>): Promise<string> {
    const ref = await addDoc(
      collection(this.firestore, this.col),
      { ...cita, fechaRegistro: new Date().toISOString() }
    );
    return ref.id;
  }

  async actualizarCita(idCita: string, cambios: Partial<Cita>): Promise<void> {
    await updateDoc(doc(this.firestore, this.col, idCita), cambios);
  }

  async cambiarEstado(idCita: string, estado: Cita['estado']): Promise<void> {
    await updateDoc(doc(this.firestore, this.col, idCita), { estado });
  }

  async eliminarCita(idCita: string): Promise<void> {
    await deleteDoc(doc(this.firestore, this.col, idCita));
  }

  // ── Solo marca no_asistio para citas pasadas ─────────────────────
  // Se llama manualmente desde la página al cargar, y cada 5 min

  async revisarVencidas(): Promise<void> {
    if (this.actualizando) return;
    this.actualizando = true;

    try {
      const ahora    = new Date();
      const fechaHoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
      const horaAhora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;

      this.getTodas().pipe(take(1)).subscribe(async citas => {
        const vencidas = citas.filter(c =>
          (c.estado === 'pendiente' || c.estado === 'en_proceso') &&
          (c.fecha < fechaHoy || (c.fecha === fechaHoy && c.horaFin <= horaAhora))
        );

        for (const c of vencidas) {
          await this.cambiarEstado(c.idCita, 'no_asistio');
        }
      });
    } finally {
      setTimeout(() => this.actualizando = false, 3000); // libera tras 3s
    }
  }
}