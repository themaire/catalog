import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  effect,
  input,
  signal,
  viewChild
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, forkJoin } from 'rxjs';
import type { EmbeddedViewer } from 'online-3d-viewer';
import { ApiService } from '../../services/api';
import { ModelFile } from '../../models';

/**
 * Viewer 3D basé sur Online 3D Viewer (three.js). Les fichiers sont récupérés via l'API
 * (avec le token) puis passés au viewer sous forme de File : pas d'URL publique nécessaire.
 * La lib (~1 Mo) est chargée dynamiquement, uniquement quand un viewer est affiché.
 */
@Component({
  selector: 'app-viewer3d',
  imports: [MatIconModule, MatProgressSpinnerModule],
  templateUrl: './viewer3d.html',
  styleUrl: './viewer3d.css'
})
export class Viewer3d implements AfterViewInit, OnDestroy {
  /** Fichier principal en premier, puis les fichiers annexes éventuels (mtl, textures...). */
  readonly files = input.required<ModelFile[]>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('canvasHost');
  private viewer: EmbeddedViewer | null = null;
  private fetchSub: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private ready = false;

  constructor(
    private readonly api: ApiService,
    private readonly zone: NgZone
  ) {
    effect(() => {
      const files = this.files();
      if (this.ready) this.load(files);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const OV = await import('online-3d-viewer');
    const element = this.host().nativeElement;
    // Boucle de rendu hors zone Angular : pas de détection de changements à chaque frame.
    this.viewer = this.zone.runOutsideAngular(
      () =>
        new OV.EmbeddedViewer(element, {
          backgroundColor: new OV.RGBAColor(52, 58, 86, 255),
          defaultColor: new OV.RGBColor(242, 214, 162),
          edgeSettings: new OV.EdgeSettings(false, new OV.RGBColor(0, 0, 0), 1),
          onModelLoaded: () => this.zone.run(() => this.loading.set(false)),
          onModelLoadFailed: () =>
            this.zone.run(() => {
              this.loading.set(false);
              this.error.set('Format non reconnu ou fichier corrompu');
            })
        })
    );
    this.resizeObserver = new ResizeObserver(() => this.viewer?.Resize());
    this.resizeObserver.observe(element);
    this.ready = true;
    this.load(this.files());
  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.viewer?.Destroy();
  }

  private load(files: ModelFile[]): void {
    this.fetchSub?.unsubscribe();
    if (!files.length || !this.viewer) return;
    this.loading.set(true);
    this.error.set(null);
    this.fetchSub = forkJoin(files.map((f) => this.api.modelFile(f))).subscribe({
      next: (fileObjects) => this.zone.runOutsideAngular(() => this.viewer?.LoadModelFromFileList(fileObjects)),
      error: () => {
        this.loading.set(false);
        this.error.set('Impossible de récupérer le fichier');
      }
    });
  }
}
