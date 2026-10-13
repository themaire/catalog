import { Component, OnDestroy, effect, input, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, from, switchMap } from 'rxjs';
import { ApiService } from '../../services/api';
import { ModelFile } from '../../models';

/** Au-delà, seul le début est affiché (gros gcode...). */
const MAX_BYTES = 2 * 1024 * 1024;

/** UTF-8 si valide, sinon Windows-1252 (vieux README/txt Windows). */
function decode(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

@Component({
  selector: 'app-text-viewer',
  imports: [MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (error()) {
      <div class="state error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else if (text() === null) {
      <div class="state"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      @if (truncated()) {
        <div class="notice">Fichier volumineux : seuls les 2 premiers Mo sont affichés.</div>
      }
      <pre>{{ text() }}</pre>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; border-radius: 8px; overflow: hidden; background: var(--stl-primary-dark); }
    pre { flex: 1; margin: 0; padding: 0.8rem 1rem; overflow: auto; white-space: pre-wrap; word-break: break-word;
          font: 0.82rem/1.45 ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; color: rgba(255,255,255,0.9); }
    .notice { padding: 0.4rem 1rem; font-size: 0.8rem; background: rgba(242,214,162,0.15); color: var(--stl-accent); }
    .state { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: rgba(255,255,255,0.8); }
    .state.error { color: #ffb4a9; }
  `
})
export class TextViewer implements OnDestroy {
  readonly file = input.required<ModelFile>();
  readonly text = signal<string | null>(null);
  readonly truncated = signal(false);
  readonly error = signal<string | null>(null);
  private sub: Subscription | null = null;

  constructor(private readonly api: ApiService) {
    effect(() => {
      const file = this.file();
      untracked(() => this.load(file));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private load(file: ModelFile): void {
    this.sub?.unsubscribe();
    this.text.set(null);
    this.error.set(null);
    this.sub = this.api
      .modelFile(file)
      .pipe(
        switchMap((blob) => {
          this.truncated.set(blob.size > MAX_BYTES);
          return from(blob.slice(0, MAX_BYTES).arrayBuffer());
        })
      )
      .subscribe({
        next: (buffer) => this.text.set(decode(buffer)),
        error: () => this.error.set('Impossible de récupérer le fichier')
      });
  }
}
