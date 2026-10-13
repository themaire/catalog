import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';

/** Premier lancement : choix du mot de passe du compte admin. */
@Component({
  selector: 'app-setup',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './setup.html',
  styleUrl: '../login/login.css'
})
export class Setup implements OnInit {
  password = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  saving = signal(false);

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Instance déjà initialisée : rien à faire ici.
    this.api.setupStatus().subscribe((s) => {
      if (!s.required) this.router.navigateByUrl('/');
    });
  }

  submit(): void {
    this.error.set(null);
    if (this.password.length < 8) return this.error.set('Le mot de passe doit faire au moins 8 caractères');
    if (this.password !== this.confirmPassword) return this.error.set('Les deux mots de passe ne correspondent pas');

    this.saving.set(true);
    this.api.setup(this.password).subscribe({
      next: ({ token, role }) => {
        this.auth.setSession(token, role);
        this.router.navigateByUrl('/admin');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? "Échec de l'initialisation");
      }
    });
  }
}
