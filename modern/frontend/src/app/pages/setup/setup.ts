import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { FolderPicker } from '../../components/folder-picker/folder-picker';
import { LibraryUpdate } from '../../models';

/** Assistant de premier lancement : mot de passe admin, dossier des modèles, récapitulatif. */
@Component({
  selector: 'app-setup',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    FolderPicker
  ],
  templateUrl: './setup.html',
  styleUrls: ['../login/login.css', './setup.css']
})
export class Setup implements OnInit {
  password = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  saving = signal(false);

  passwordDone = signal(false);
  importing = signal(false);
  result = signal<LibraryUpdate | null>(null);

  /** Étape affichée, pilotée par le code (les en-têtes ne sont pas cliquables). */
  step = signal(0);

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Instance déjà initialisée (et assistant pas en cours) : rien à faire ici.
    this.api.setupStatus().subscribe((s) => {
      if (!s.required && !this.passwordDone()) this.router.navigateByUrl('/');
    });
  }

  submitPassword(): void {
    this.error.set(null);
    if (this.password.length < 8) return this.error.set('Le mot de passe doit faire au moins 8 caractères');
    if (this.password !== this.confirmPassword) return this.error.set('Les deux mots de passe ne correspondent pas');

    this.saving.set(true);
    this.api.setup(this.password).subscribe({
      next: ({ token, role }) => {
        this.auth.setSession(token, role);
        this.saving.set(false);
        this.passwordDone.set(true);
        this.password = this.confirmPassword = '';
        this.step.set(1);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? "Échec de l'initialisation");
      }
    });
  }

  chooseFolder(path: string): void {
    this.importing.set(true);
    this.error.set(null);
    this.api.setLibrary(path).subscribe({
      next: (res) => {
        this.importing.set(false);
        this.result.set(res);
        this.step.set(2);
      },
      error: (err) => {
        this.importing.set(false);
        this.error.set(err?.error?.error ?? "Impossible d'utiliser ce dossier");
      }
    });
  }
}
