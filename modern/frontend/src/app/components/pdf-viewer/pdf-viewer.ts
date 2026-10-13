import { Component, OnDestroy, effect, input, signal, untracked } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api';
import { ModelFile } from '../../models';

/** PDF affiché par le lecteur intégré du navigateur, à partir d'une URL blob locale. */
@Component({
  selector: 'app-pdf-viewer',
  imports: [MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (error()) {
      <div class="state error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (url(); as u) {
      <iframe [src]="u" [title]="file().name"></iframe>
    } @else {
      <div class="state"><mat-spinner diameter="40"></mat-spinner></div>
    }
  `,
  styles: `
    :host { display: flex; height: 100%; border-radius: 8px; overflow: hidden; background: var(--stl-primary-dark); }
    iframe { flex: 1; border: 0; background: #fff; }
    .state { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: rgba(255,255,255,0.8); }
    .state.error { color: #ffb4a9; }
  `
})
export class PdfViewer implements OnDestroy {
  readonly file = input.required<ModelFile>();
  readonly url = signal<SafeResourceUrl | null>(null);
  readonly error = signal<string | null>(null);
  private objectUrl: string | null = null;
  private sub: Subscription | null = null;

  constructor(
    private readonly api: ApiService,
    private readonly sanitizer: DomSanitizer
  ) {
    effect(() => {
      const file = this.file();
      untracked(() => this.load(file));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.revoke();
  }

  private load(file: ModelFile): void {
    this.sub?.unsubscribe();
    this.revoke();
    this.error.set(null);
    this.sub = this.api.modelFile(file).subscribe({
      next: (blob) => {
        // Le type doit être application/pdf pour que le navigateur l'affiche au lieu de le télécharger.
        this.objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.url.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
      },
      error: () => this.error.set('Impossible de récupérer le PDF')
    });
  }

  private revoke(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.url.set(null);
  }
}
