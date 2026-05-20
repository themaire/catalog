import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api';
import { ModelSummary } from '../../models';

@Component({
  selector: 'app-list',
  imports: [RouterLink, DatePipe, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './list.html',
  styleUrl: './list.css'
})
export class List implements OnInit {
  category = signal('');
  models = signal<ModelSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const category = params.get('category');
      if (!category) {
        this.error.set('Catégorie manquante');
        this.loading.set(false);
        return;
      }
      this.category.set(category);
      this.loading.set(true);
      this.api.models(category).subscribe({
        next: (models) => {
          this.models.set(models);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les modèles');
          this.loading.set(false);
        }
      });
    });
  }
}
