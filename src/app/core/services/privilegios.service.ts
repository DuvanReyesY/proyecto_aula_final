import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, docData, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

// ─── INTERFACES ──────────────────────────────────────────────────────────────

export interface PrivilegiosRecepcionista {
  // Usuarios y mascotas
  crearUsuarios: boolean;
  editarUsuarios: boolean;
  verUsuarios: boolean;
  crearMascotas: boolean;
  editarMascotas: boolean;
  verMascotas: boolean;
  // Citas
  crearCitas: boolean;
  cancelarCitas: boolean;
  reprogramarCitas: boolean;
  verCitas: boolean;
}

export interface PrivilegiosVeterinario {
  // Citas asignadas
  verCitasAsignadas: boolean;
  diagnosticarCitas: boolean;
  // Historial
  verHistorialMascota: boolean;
}

export interface PrivilegiosCliente {
}

export interface PrivilegiosAdministrador {
  // Admin tiene acceso total, pero se registra para consistencia
  accesoTotal: boolean;
}

// Tipo unión para guardar en Firestore
export type Privilegios =
  | (PrivilegiosRecepcionista & { rol: 'recepcionista'; uid: string })
  | (PrivilegiosVeterinario   & { rol: 'veterinario';   uid: string })
  | (PrivilegiosCliente       & { rol: 'cliente';       uid: string })
  | (PrivilegiosAdministrador & { rol: 'administrador'; uid: string });

// ─── DEFAULTS POR ROL ────────────────────────────────────────────────────────

export function getPrivilegiosDefault(rol: string, uid: string): Privilegios {
  switch (rol) {
    case 'recepcionista':
      return {
        uid,
        rol: 'recepcionista',
        crearUsuarios:      true,
        editarUsuarios:     true,
        verUsuarios:        true,
        crearMascotas:      true,
        editarMascotas:     true,
        verMascotas:        true,
        crearCitas:         true,
        cancelarCitas:      true,
        reprogramarCitas:   true,
        verCitas:           true,
      };

    case 'veterinario':
      return {
        uid,
        rol: 'veterinario',
        verCitasAsignadas:    true,
        diagnosticarCitas:    true,
        verHistorialMascota:  true,
      };

    case 'cliente':
      return {
        uid,
        rol: 'cliente',
        //se odra asignar algo despues pero por ahora no tiene privilegios específicos
      };

    case 'administrador':
    default:
      return {
        uid,
        rol: 'administrador',
        accesoTotal: true,
      };
  }
}

// ─── SERVICIO ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PrivilegiosService {
  private firestore = inject(Firestore);

  /**
   * Crea los privilegios por defecto al registrar un usuario.
   * Llamar desde UserService justo después de crear el usuario.
   */
  crearPrivilegiosDefault(uid: string, rol: string): Promise<void> {
    const privilegios = getPrivilegiosDefault(rol, uid);
    return setDoc(doc(this.firestore, 'privilegios', uid), privilegios);
  }

  /**
   * Obtiene los privilegios de un usuario en tiempo real (por UID).
   */
  getPrivilegios(uid: string): Observable<any> {
    return docData(doc(this.firestore, 'privilegios', uid));
  }

  /**
   * Actualiza privilegios específicos de un usuario (merge parcial).
   * El admin llama esto desde el modal.
   */
  actualizarPrivilegios(uid: string, cambios: Partial<Privilegios>): Promise<void> {
    return updateDoc(doc(this.firestore, 'privilegios', uid), cambios as any);
  }

  /**
   * Reemplaza completamente los privilegios de un usuario.
   */
  setPrivilegios(uid: string, privilegios: Privilegios): Promise<void> {
    return setDoc(doc(this.firestore, 'privilegios', uid), privilegios);
  }

  /**
   * Helper: verifica si el usuario tiene un privilegio específico.
   * Uso: await this.privilegiosService.tienePrivilegio(uid, 'crearCitas')
   */
  async tienePrivilegio(uid: string, privilegio: string): Promise<boolean> {
    return new Promise(resolve => {
      this.getPrivilegios(uid).subscribe(p => {
        resolve(p ? !!p[privilegio] : false);
      });
    });
  }
}