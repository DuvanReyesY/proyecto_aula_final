import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email: string = '';
  password: string = '';
  error: string = '';

  constructor(private authService: AuthService) {}

  async login() {
    try {
      this.error = '';
      await this.authService.login(this.email, this.password);
    } catch (err: any) {
      this.error = 'Correo o contraseña incorrectos';
      console.error(err);
    }
  }
}