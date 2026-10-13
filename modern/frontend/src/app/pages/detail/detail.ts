import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../services/api';
import { ModelDetail, ModelFile } from '../../models';
import { VIEWABLE_TYPES, Viewer3d } from '../../components/viewer3d/viewer3d';

const OBJ_COMPANION_TYPES = new Set(['mtl', 'jpg', 'jpeg', 'png']);

function dirOf(file: ModelFile): string {
  const slash = file.path.lastIndexOf('/');
  return slash >= 0 ? file.path.slice(0, slash) : '';
}

@Component({
  selector: 'app-detail',
  imports: [
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    Viewer3d
  ],
  templateUrl: './detail.html',
  styleUrl: './detail.css'
})
export class Detail implements OnInit {
  model = signal<ModelDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  downloading = signal(false);

  /** Fichiers affichables dans le viewer, STL en tête. */
  viewable = computed(() => {
    const files = this.model()?.files ?? [];
    return files
      .filter((f) => VIEWABLE_TYPES.has(f.type))
      .sort((a, b) => Number(b.type === 'stl') - Number(a.type === 'stl') || a.path.localeCompare(b.path));
  });
  selected = signal<ModelFile | null>(null);

  /** Fichier sélectionné + annexes d'un OBJ (mtl/textures du même dossier). */
  viewerFiles = computed<ModelFile[]>(() => {
    const main = this.selected();
    if (!main) return [];
    if (main.type !== 'obj') return [main];
    const dir = dirOf(main);
    const companions = (this.model()?.files ?? []).filter(
      (f) => OBJ_COMPANION_TYPES.has(f.type) && dirOf(f) === dir
    );
    return [main, ...companions];
  });

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
          this.selected.set(this.viewable()[0] ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger le détail');
          this.loading.set(false);
        }
      });
    });
  }

  isViewable(file: ModelFile): boolean {
    return VIEWABLE_TYPES.has(file.type);
  }

  select(file: ModelFile): void {
    if (this.isViewable(file)) this.selected.set(file);
  }

  download(modelId: number): void {
    this.downloading.set(true);
    this.api.downloadModel(modelId).subscribe({
      next: () => this.downloading.set(false),
      error: () => {
        this.downloading.set(false);
        this.error.set('Téléchargement impossible');
      }
    });
  }
}
