import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  user$ = user(this.auth);

async login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(this.auth, email, password);
  const uid = cred.user.uid;
  const rol = await this.getRol(uid);

  if (!rol) throw new Error('Usuario no encontrado en ninguna colección');

  localStorage.setItem('uid', uid);
  localStorage.setItem('rol', rol);

  this.router.navigate(['/layout']);       
}

  async getRol(uid: string): Promise<string | null> {
    const colecciones = ['administradores', 'clientes', 'recepcionistas', 'veterinarios'];
    const roles      = ['administrador',   'cliente',  'recepcionista',   'veterinario'];

    for (let i = 0; i < colecciones.length; i++) {
      const snap = await getDoc(doc(this.firestore, colecciones[i], uid));
      if (snap.exists()) return roles[i];
    }
    return null;
  }

  async logout() {
    await signOut(this.auth);
    localStorage.removeItem('uid');
    localStorage.removeItem('rol');
    this.router.navigate(['/login']);
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