import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './services/auth';
import { ApiService } from './services/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(
    public readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Premier lancement : tant que le mot de passe admin n'est pas défini, tout renvoie vers /setup.
    this.api.setupStatus().subscribe({
      next: (s) => {
        if (s.required) this.router.navigateByUrl('/setup');
      }
    });
  }

  logout(): void {
    this.auth.clearSession();
  }
}
