import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc, docData, getDoc, collection, collectionData, updateDoc } from '@angular/fire/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrivilegiosService } from './privilegios.service'; // 👈

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth      = inject(Auth);
  private firestore = inject(Firestore);
  private privilegiosService = inject(PrivilegiosService); // 👈

  // ─── REGISTRO — cada método crea el usuario Y sus privilegios ──────────────

  async registerAdministrador(data: any) {
    const cred = await createUserWithEmailAndPassword(this.auth, data.Correo, data.Contrasena);
    const uid  = cred.user.uid;

    await setDoc(doc(this.firestore, 'administradores', uid), {
      idAdministrador: uid,
      Cedula:   data.Cedula,
      Nombre:   data.Nombre,
      Apellido: data.Apellido,
      Telefono: data.Telefono,
      Correo:   data.Correo,
      estado:   data.estado ?? 'activo',
    });

    // ✅ Crear privilegios por defecto
    await this.privilegiosService.crearPrivilegiosDefault(uid, 'administrador');
  }

  async registerRecepcionista(data: any) {
    const cred = await createUserWithEmailAndPassword(this.auth, data.Correo, data.Contrasena);
    const uid  = cred.user.uid;

    await setDoc(doc(this.firestore, 'recepcionistas', uid), {
      idRecepcionista: uid,
      Cedula:          data.Cedula,
      Nombre:          data.Nombre,
      Apellido:        data.Apellido,
      Telefono:        data.Telefono,
      Correo:          data.Correo,
      estado:          data.estado ?? 'activo',
      idAdministrador: data.idAdministrador,
    });

    // ✅ Crear privilegios por defecto
    await this.privilegiosService.crearPrivilegiosDefault(uid, 'recepcionista');
  }

  async registerVeterinario(data: any) {
    const cred = await createUserWithEmailAndPassword(this.auth, data.Correo, data.Contrasena);
    const uid  = cred.user.uid;

    await setDoc(doc(this.firestore, 'veterinarios', uid), {
      idVeterinario:   uid,
      Cedula:          data.Cedula,
      Nombre:          data.Nombre,
      Apellido:        data.Apellido,
      Telefono:        data.Telefono,
      Correo:          data.Correo,
      Especialidad:    data.Especialidad,
      estado:          data.estado ?? 'activo',
      idAdministrador: data.idAdministrador,
    });

    // ✅ Crear privilegios por defecto
    await this.privilegiosService.crearPrivilegiosDefault(uid, 'veterinario');
  }

  async registerCliente(data: any) {
    const cred = await createUserWithEmailAndPassword(this.auth, data.Correo, data.Contrasena);
    const uid  = cred.user.uid;

    await setDoc(doc(this.firestore, 'clientes', uid), {
      idCliente:       uid,
      Nombre:          data.Nombre,
      Apellido:        data.Apellido,
      Telefono:        data.Telefono,
      Correo:          data.Correo,
      estado:          data.estado ?? 'activo',
      idAdministrador: data.idAdministrador,
    });

    // ✅ Crear privilegios por defecto
    await this.privilegiosService.crearPrivilegiosDefault(uid, 'cliente');
  }

  // ─── LECTURA ───────────────────────────────────────────────────────────────

  getTodosLosUsuarios(): Observable<any[]> {
    const admins$ = collectionData(
      collection(this.firestore, 'administradores'), { idField: 'uid' }
    ).pipe(map((u: any[]) => u.map(x => ({ ...x, rol: 'administrador' }))));

    const clientes$ = collectionData(
      collection(this.firestore, 'clientes'), { idField: 'uid' }
    ).pipe(map((u: any[]) => u.map(x => ({ ...x, rol: 'cliente' }))));

    const recepcionistas$ = collectionData(
      collection(this.firestore, 'recepcionistas'), { idField: 'uid' }
    ).pipe(map((u: any[]) => u.map(x => ({ ...x, rol: 'recepcionista' }))));

    const veterinarios$ = collectionData(
      collection(this.firestore, 'veterinarios'), { idField: 'uid' }
    ).pipe(map((u: any[]) => u.map(x => ({ ...x, rol: 'veterinario' }))));

    return combineLatest([admins$, clientes$, recepcionistas$, veterinarios$]).pipe(
      map(([a, c, r, v]) => [...a, ...c, ...r, ...v])
    );
  }

  async getDocumentOnce(coleccion: string, uid: string): Promise<any | null> {
    const snap = await getDoc(doc(this.firestore, coleccion, uid));
    return snap.exists() ? snap.data() : null;
  }

  getDocument(coleccion: string, uid: string) {
    return docData(doc(this.firestore, coleccion, uid));
  }

  // ─── ACCIONES ──────────────────────────────────────────────────────────────

  cambiarEstado(coleccion: string, uid: string, estado: string) {
    return updateDoc(doc(this.firestore, coleccion, uid), { estado });
  }

  actualizarUsuario(coleccion: string, uid: string, cambios: any): Promise<void> {
  return updateDoc(doc(this.firestore, coleccion, uid), cambios);
}

  getColeccionPorRol(rol: string): string {
    const map: any = {
      administrador: 'administradores',
      cliente:       'clientes',
      recepcionista: 'recepcionistas',
      veterinario:   'veterinarios',
    };
    return map[rol];
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
}