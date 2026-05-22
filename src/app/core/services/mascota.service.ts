import { Injectable, inject } from '@angular/core';
import {
  Firestore, doc, setDoc, docData, getDoc,
  collection, collectionData,
  updateDoc, query, where,
} from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { collectionGroup } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
export interface Mascota {
  idMascota: string;
  idCliente: string;
  nombre: string;
  especie: string;
  raza: string;
  sexo: 'macho' | 'hembra';
  fechaNacimiento: string;
  color: string;
  peso: number;
  estado: 'activo' | 'inactivo';
  fechaRegistro: string;
  idClienteAnterior?: string;
  fechaMigracion?: string;
  antecedentes?: AntecedentesMedicos;
}

export interface AntecedentesMedicos {
  alergias?: string;
  cirugias?: string;
  enfermedadesCr?: string; // Crónicas
  esquemaVacunacion?: string;
  dieta?: string;
}

// ─── INTERFACES ──────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MascotaService {
  private firestore = inject(Firestore);

  // Referencia helper para no repetir la ruta
  private mascotaRef(idCliente: string, idMascota: string) {
    return doc(this.firestore, `clientes/${idCliente}/mascotas/${idMascota}`);
  }

  private mascotasColRef(idCliente: string) {
    return collection(this.firestore, `clientes/${idCliente}/mascotas`);
  }

  async registrarMascota(data: Omit<Mascota, 'idMascota'> & { idMascota?: string }): Promise<string> {
    const idMascota = data.idMascota ?? this.generarIdMascota();
    const mascota: Mascota = {
      ...data,
      idMascota,
      estado: data.estado ?? 'activo',
      fechaRegistro: data.fechaRegistro ?? new Date().toISOString(),
    };
    await setDoc(this.mascotaRef(data.idCliente, idMascota), mascota);
    return idMascota;
  }

  // Ya no existe getTodas() simple — ahora usamos collectionGroup
    getTodas(): Observable<Mascota[]> {
      return collectionData(
        collectionGroup(this.firestore, 'mascotas'),
        { idField: 'idMascota' }
      ) as Observable<Mascota[]>;
    }

  private generarIdMascota(): string {
  return doc(collection(this.firestore, 'mascotas')).id;
  }

  getMascotasPorCliente(idCliente: string): Observable<Mascota[]> {
    return collectionData(
      this.mascotasColRef(idCliente),
      { idField: 'idMascota' }
    ) as Observable<Mascota[]>;
  }

  // Ahora requiere idCliente también
  getMascota(idCliente: string, idMascota: string): Observable<Mascota> {
    return docData(
      this.mascotaRef(idCliente, idMascota),
      { idField: 'idMascota' }
    ) as Observable<Mascota>;
  }

  async getMascotaOnce(idCliente: string, idMascota: string): Promise<Mascota | null> {
    const snap = await getDoc(this.mascotaRef(idCliente, idMascota));
    return snap.exists() ? ({ idMascota: snap.id, ...snap.data() } as Mascota) : null;
  }

  getMascotasPorClientes(idsClientes: string[]): Observable<Mascota[]> {
    if (!idsClientes.length) return of([]);
    const observables = idsClientes.map(id =>
      collectionData(this.mascotasColRef(id), { idField: 'idMascota' }) as Observable<Mascota[]>
    );
    return combineLatest(observables).pipe(
      map(arrays => arrays.reduce((acc, curr) => acc.concat(curr), [] as Mascota[]))
    );
  }

  actualizarMascota(idCliente: string, idMascota: string, cambios: Partial<Mascota>): Promise<void> {
    return updateDoc(this.mascotaRef(idCliente, idMascota), cambios as any);
  }

  actualizarPeso(idCliente: string, idMascota: string, nuevoPeso: number): Promise<void> {
    return updateDoc(this.mascotaRef(idCliente, idMascota), {
      Peso: nuevoPeso,
      ultimaActualizacionPeso: new Date().toISOString(),
    });
  }

  cambiarEstado(idCliente: string, idMascota: string, estado: 'activo' | 'inactivo'): Promise<void> {
    return updateDoc(this.mascotaRef(idCliente, idMascota), { estado });
  }

  async eliminarMascota(idCliente: string, idMascota: string): Promise<void> {
    const { deleteDoc } = await import('@angular/fire/firestore');
    await deleteDoc(this.mascotaRef(idCliente, idMascota));
  }

  async getRazasPorEspecie(especie: string): Promise<string[]> {
  const razas: Record<string, string[]> = {
    perro:  ['Labrador', 'Golden Retriever', 'Bulldog', 'Pastor Alemán', 'Poodle', 'Otro'],
    gato:   ['Siamés', 'Persa', 'Maine Coon', 'Bengalí', 'Ragdoll', 'Otro'],
    ave:    ['Canario', 'Periquito', 'Loro', 'Cacatúa', 'Agapornis', 'Otro'],
    reptil: ['Iguana', 'Gecko', 'Tortuga', 'Camaleón', 'Serpiente', 'Otro'],
    otro:   ['Otro'],
  };
  return razas[especie?.toLowerCase()] ?? ['Otro'];
}
}