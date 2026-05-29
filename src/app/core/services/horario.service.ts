// src/app/core/services/horario.service.ts

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

export type DiaSemana =
  | 'lunes' | 'martes' | 'miercoles' | 'jueves'
  | 'viernes' | 'sabado' | 'domingo';

export interface Turno {
  inicio: string; // "08:00"
  fin:    string; // "12:00"
}

export interface HorarioDia {
  dia:    DiaSemana;
  activo: boolean;
  turnos: Turno[];
}

export const TURNOS_PRESET: Record<string, Turno> = {
  manana: { inicio: '08:00', fin: '12:00' },
  tarde:  { inicio: '13:00', fin: '18:00' },
};

export const DIAS_SEMANA: DiaSemana[] = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
];

// Mapea Date.getDay() (0=Dom) → DiaSemana
export const DOW_MAP: Record<number, DiaSemana> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles',
  4: 'jueves',  5: 'viernes', 6: 'sabado',
};

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private firestore = inject(Firestore);

  // ── Ruta subcolección ──────────────────────────────────────────────────────
  private horarioRef(uid: string, dia: DiaSemana) {
    return doc(this.firestore, `veterinarios/${uid}/horarios/${dia}`);
  }

  private horariosColRef(uid: string) {
    return collection(this.firestore, `veterinarios/${uid}/horarios`);
  }

  // ── Lectura reactiva ───────────────────────────────────────────────────────

  getHorarios(uid: string): Observable<HorarioDia[]> {
    return collectionData(this.horariosColRef(uid), { idField: 'dia' }) as Observable<HorarioDia[]>;
  }

  async getHorariosOnce(uid: string): Promise<HorarioDia[]> {
    const snap = await getDocs(this.horariosColRef(uid));
    return snap.docs.map(d => ({ dia: d.id as DiaSemana, ...d.data() } as HorarioDia));
  }

  // ── Escritura ──────────────────────────────────────────────────────────────

  async guardarHorario(uid: string, horario: HorarioDia): Promise<void> {
    await setDoc(this.horarioRef(uid, horario.dia), {
      activo: horario.activo,
      turnos: horario.turnos,
    });
  }

  async guardarTodosLosHorarios(uid: string, horarios: HorarioDia[]): Promise<void> {
    await Promise.all(horarios.map(h => this.guardarHorario(uid, h)));
  }

  async eliminarHorario(uid: string, dia: DiaSemana): Promise<void> {
    await deleteDoc(this.horarioRef(uid, dia));
  }

  // ── Utilidades ─────────────────────────────────────────────────────────────

  /**
   * Dado un veterinario y una fecha ISO "2026-05-28",
   * retorna los turnos activos para ese día de la semana.
   */
  async getTurnosParaFecha(uid: string, fechaStr: string): Promise<Turno[]> {
    const date = new Date(fechaStr + 'T12:00:00');
    const dia  = DOW_MAP[date.getDay()];
    const horarios = await this.getHorariosOnce(uid);
    const horarioDia = horarios.find(h => h.dia === dia);
    if (!horarioDia || !horarioDia.activo) return [];
    return horarioDia.turnos;
  }

  /**
   * Genera todos los slots de 30 min dentro de los turnos activos.
   * Retorna array de strings: ["08:00","08:30","09:00",...]
   */
  getSlotsFromTurnos(turnos: Turno[]): string[] {
    const slots: string[] = [];
    for (const turno of turnos) {
      const [sh, sm] = turno.inicio.split(':').map(Number);
      const [eh, em] = turno.fin.split(':').map(Number);
      let mins = sh * 60 + sm;
      const end = eh * 60 + em;
      while (mins < end) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
        mins += 30;
      }
    }
    return slots;
  }

  /**
   * Verifica si una hora concreta cae dentro de algún turno activo.
   */
  horaEstaEnTurno(hora: string, turnos: Turno[]): boolean {
    const [h, m] = hora.split(':').map(Number);
    const mins   = h * 60 + m;
    return turnos.some(t => {
      const ini = this.toMins(t.inicio);
      const fin = this.toMins(t.fin);
      return mins >= ini && mins < fin;
    });
  }

  private toMins(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  /** Horario vacío por defecto para un día */
  horarioVacio(dia: DiaSemana): HorarioDia {
    return { dia, activo: false, turnos: [] };
  }
}