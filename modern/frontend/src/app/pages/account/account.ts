import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-account',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './account.html',
  styleUrl: '../login/login.css'
})
export class Account {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  done = signal(false);
  saving = signal(false);

  constructor(private readonly api: ApiService) {}

  submit(): void {
    this.error.set(null);
    this.done.set(false);
    if (this.newPassword.length < 8) return this.error.set('Le nouveau mot de passe doit faire au moins 8 caractères');
    if (this.newPassword !== this.confirmPassword) return this.error.set('Les deux mots de passe ne correspondent pas');

    this.saving.set(true);
    this.api.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.done.set(true);
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Échec du changement de mot de passe');
      }
    });
  }
}
