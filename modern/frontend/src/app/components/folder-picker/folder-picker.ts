import { Component, OnInit, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api';
import { BrowseResult, LibraryInfo } from '../../models';

/**
 * Explorateur des dossiers de l'hôte montés dans le backend (/media, /mnt, /home, dossier du projet),
 * avec un aperçu de ce que le scan trouverait. Émet le chemin choisi.
 */
@Component({
  selector: 'app-folder-picker',
  imports: [MatButtonModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './folder-picker.html',
  styleUrl: './folder-picker.css'
})
export class FolderPicker implements OnInit {
  /** Libellé du bouton de validation. */
  readonly confirmLabel = input('Utiliser ce dossier');
  readonly busy = input(false);
  readonly chosen = output<string>();

  readonly library = signal<LibraryInfo | null>(null);
  readonly listing = signal<BrowseResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.library().subscribe({
      next: (lib) => {
        this.library.set(lib);
        this.open(lib.current.path);
      },
      error: () => this.error.set('Impossible de lire les emplacements disponibles')
    });
  }

  open(path: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.browse(path).subscribe({
      next: (res) => {
        this.listing.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Dossier inaccessible');
      }
    });
  }

  /** Racine qui contient le dossier affiché (puce active). */
  isActiveRoot(rootPath: string): boolean {
    const current = this.listing()?.path ?? '';
    return current === rootPath || current.startsWith(`${rootPath}/`);
  }

  confirm(): void {
    const current = this.listing();
    if (current) this.chosen.emit(current.path);
  }
}
