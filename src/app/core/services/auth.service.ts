import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  private privilegiosUnsub: (() => void) | null = null;

  user$ = user(this.auth);
  privilegios$ = new BehaviorSubject<any>({});

  async login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const uid = cred.user.uid;
    const rol = await this.getRol(uid);

    if (!rol) throw new Error('Usuario no encontrado en ninguna colección');

    localStorage.setItem('uid', uid);
    localStorage.setItem('rol', rol);

    this.cargarPrivilegios(uid);

    this.router.navigate(['/layout']);
  }

  async getRol(uid: string): Promise<string | null> {
    const colecciones = ['administradores', 'clientes', 'recepcionistas', 'veterinarios'];
    const roles       = ['administrador',   'cliente',  'recepcionista',   'veterinario'];

    for (let i = 0; i < colecciones.length; i++) {
      const snap = await getDoc(doc(this.firestore, colecciones[i], uid));
      if (snap.exists()) return roles[i];
    }
    return null;
  }

  private cargarPrivilegios(uid: string): void {
    if (this.privilegiosUnsub) this.privilegiosUnsub();

    this.privilegiosUnsub = onSnapshot(
      doc(this.firestore, 'privilegios', uid),
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        localStorage.setItem('privilegios', JSON.stringify(data));
        this.privilegios$.next(data); // ← notifica a Angular
      },
      (error) => {
        console.log('Error escuchando privilegios:', error);
        localStorage.setItem('privilegios', '{}');
        this.privilegios$.next({});
      }
    );
  }

  tienePrivilegio(clave: string): boolean {
    const raw = localStorage.getItem('privilegios');
    if (!raw) return false;
    try {
      const p = JSON.parse(raw);
      return clave in p && p[clave] === true;
    } catch {
      return false;
    }
  }

  async recargarPrivilegios(): Promise<void> {
    const uid = this.getUidActual();
    if (uid) this.cargarPrivilegios(uid);
  }

  async logout() {
    if (this.privilegiosUnsub) {
      this.privilegiosUnsub();
      this.privilegiosUnsub = null;
    }
    await signOut(this.auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }

  getRolActual(): string | null {
    return localStorage.getItem('rol');
  }

  getUidActual(): string | null {
    return localStorage.getItem('uid');
  }

  estaLogueado(): boolean {
    return !!localStorage.getItem('uid');
  }
}