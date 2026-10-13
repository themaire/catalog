import { Component, ElementRef, OnInit, computed, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api';
import { ModelDetail, ModelFile } from '../../models';
import { KIND_ICONS, PreviewKind, previewKind } from '../../file-kinds';
import { Viewer3d } from '../../components/viewer3d/viewer3d';
import { ImageViewer } from '../../components/image-viewer/image-viewer';
import { TextViewer } from '../../components/text-viewer/text-viewer';
import { PdfViewer } from '../../components/pdf-viewer/pdf-viewer';

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
    MatTooltipModule,
    Viewer3d,
    ImageViewer,
    TextViewer,
    PdfViewer
  ],
  templateUrl: './detail.html',
  styleUrl: './detail.css'
})
export class Detail implements OnInit {
  model = signal<ModelDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  downloading = signal(false);

  /** Fichiers 3D du modèle, STL en tête (puces de choix rapide). */
  models3d = computed(() => {
    const files = this.model()?.files ?? [];
    return files
      .filter((f) => previewKind(f.type) === '3d')
      .sort((a, b) => Number(b.type === 'stl') - Number(a.type === 'stl') || a.path.localeCompare(b.path));
  });

  /** Fichier affiché dans la zone d'aperçu (3D, image, texte, PDF...). */
  selected = signal<ModelFile | null>(null);
  selectedKind = computed<PreviewKind>(() => {
    const file = this.selected();
    return file ? previewKind(file.type) : 'none';
  });

  /** Fichier 3D sélectionné + annexes d'un OBJ (mtl/textures du même dossier). */
  viewerFiles = computed<ModelFile[]>(() => {
    const main = this.selected();
    if (!main || this.selectedKind() !== '3d') return [];
    if (main.type !== 'obj') return [main];
    const dir = dirOf(main);
    const companions = (this.model()?.files ?? []).filter(
      (f) => OBJ_COMPANION_TYPES.has(f.type) && dirOf(f) === dir
    );
    return [main, ...companions];
  });

  private readonly previewCard = viewChild('previewCard', { read: ElementRef });

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
          // Par défaut : le premier modèle 3D, sinon la première image.
          const firstImage = model.files.find((f) => previewKind(f.type) === 'image');
          this.selected.set(this.models3d()[0] ?? firstImage ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger le détail');
          this.loading.set(false);
        }
      });
    });
  }

  icon(file: ModelFile): string {
    return KIND_ICONS[previewKind(file.type)];
  }

  select(file: ModelFile): void {
    this.selected.set(file);
    // Depuis la liste (bas de page), ramener l'aperçu à l'écran.
    const card = this.previewCard()?.nativeElement as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  downloadFile(file: ModelFile): void {
    this.api.downloadFile(file).subscribe({ error: () => this.error.set('Téléchargement impossible') });
  }
}
