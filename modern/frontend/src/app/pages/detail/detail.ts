import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api';
import { ModelDetail } from '../../models';

@Component({
  selector: 'app-detail',
  imports: [DecimalPipe, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './detail.html',
  styleUrl: './detail.css'
})
export class Detail implements OnInit {
  model = signal<ModelDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.error.set('Identifiant invalide');
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      this.api.model(id).subscribe({
        next: (model) => {
          this.model.set(model);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger le détail');
          this.loading.set(false);
        }
      });
    });
  }

  downloadUrl(modelId: number): string {
    return this.api.downloadUrl(modelId);
  }
}
