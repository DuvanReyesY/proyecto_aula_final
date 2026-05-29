import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, updatePassword } from '@angular/fire/auth';
import { Firestore, where, doc, setDoc, docData, getDoc, collection, collectionData, updateDoc, query, limit, getDocs } from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrivilegiosService } from './privilegios.service';


export interface PerfilUsuario {
  uid:           string;
  rol:           string;
  Nombre:        string;
  Apellido:      string;
  Telefono:      string;
  Correo:        string;
  estado:        string;
  Cedula?:       string;
  Especialidad?: string;
  fotoUrl?:      string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth               = inject(Auth);
  private firestore          = inject(Firestore);
  private privilegiosService = inject(PrivilegiosService);

  // ─── REGISTRO ──────────────────────────────────────────────────────────────

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

  // ─── PRIMER USO — verifica si la BD tiene al menos un administrador ────────
  //
  // Usa limit(1) para leer mínimo posible de Firestore.
  // Retorna true  → hay usuarios, mostrar login normal.
  // Retorna false → BD vacía, redirigir a registro del primer admin.

  async existeAlgunUsuario(): Promise<boolean> {
    const ref  = collection(this.firestore, 'administradores');
    const q    = query(ref, limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  // ─── ACCIONES ──────────────────────────────────────────────────────────────

  cambiarEstado(coleccion: string, uid: string, estado: string) {
    return updateDoc(doc(this.firestore, coleccion, uid), { estado });
  }

  actualizarUsuario(coleccion: string, uid: string, cambios: any): Promise<void> {
    return updateDoc(doc(this.firestore, coleccion, uid), cambios);
  }

  getColeccionPorRol(rol: string): string {
    const map: Record<string, string> = {
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

  // ─── PERFIL DEL USUARIO EN SESIÓN ─────────────────────────────────────────

  getPerfilActual(): Observable<PerfilUsuario | null> {
    const uid = localStorage.getItem('uid');
    const rol = localStorage.getItem('rol');
    if (!uid || !rol) return of(null);

    const coleccion = this.getColeccionPorRol(rol);
    return (docData(doc(this.firestore, coleccion, uid)) as Observable<any>).pipe(
      map(data => data ? ({ ...data, uid, rol } as PerfilUsuario) : null)
    );
  }

  async actualizarPerfilActual(cambios: Partial<PerfilUsuario>): Promise<void> {
    const uid = localStorage.getItem('uid');
    const rol = localStorage.getItem('rol');
    if (!uid || !rol) throw new Error('Sin sesión');

    const { rol: _r, uid: _u, estado: _e, ...camposEditables } = cambios as any;
    await updateDoc(doc(this.firestore, this.getColeccionPorRol(rol), uid), camposEditables);
  }

  async cambiarPasswordActual(passwordActual: string, passwordNuevo: string): Promise<void> {
    const usuario = this.auth.currentUser;
    if (!usuario?.email) throw new Error('Sin sesión');

    const credencial = EmailAuthProvider.credential(usuario.email, passwordActual);
    await reauthenticateWithCredential(usuario, credencial);
    await updatePassword(usuario, passwordNuevo);
  }

    async existeCedula(cedula: string): Promise<boolean> {
  const colecciones = [
    'administradores',
    'clientes',
    'recepcionistas',
    'veterinarios'
  ];

  for (const nombreColeccion of colecciones) {
    const ref = collection(this.firestore, nombreColeccion);

    const q = query(
      ref,
      where('Cedula', '==', cedula)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return true;
    }
  }

  return false;
}
}