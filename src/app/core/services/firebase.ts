import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth
  ) {}

  login(email: string, password: string) {
    return this.auth.signInWithEmailAndPassword(email, password);
  }

  register(email: string, password: string) {
    return this.auth.createUserWithEmailAndPassword(email, password);
  }

  logout() {
    return this.auth.signOut();
  }

  getCollection(collectionName: string) {
    return this.firestore.collection(collectionName).valueChanges();
  }

  addDocument(collectionName: string, data: any) {
    return this.firestore.collection(collectionName).add(data);
  }

  updateDocument(collectionName: string, id: string, data: any) {
    return this.firestore.collection(collectionName).doc(id).update(data);
  }

  deleteDocument(collectionName: string, id: string) {
    return this.firestore.collection(collectionName).doc(id).delete();
  }
}
