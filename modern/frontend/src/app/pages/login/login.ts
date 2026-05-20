import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  error = signal<string | null>(null);

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.error.set(null);
    this.api.login(this.username, this.password).subscribe({
      next: ({ token, role }) => {
        this.auth.setSession(token, role);
        this.router.navigateByUrl('/');
      },
      error: (error) => {
        if (error?.status === 0) {
          this.error.set('Impossible de joindre le serveur.');
        } else if (error?.status === 401) {
          this.error.set('Identifiants invalides');
        } else {
          this.error.set('Erreur serveur. Réessayez plus tard.');
        }
      }
    });
  }
}
