import { Component, ElementRef, OnDestroy, computed, effect, input, signal, untracked, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api';
import { ModelFile } from '../../models';

const MIN_SCALE = 0.02;
const MAX_SCALE = 32;
const WHEEL_STEP = 1.15;

/**
 * Visualiseur d'image : ajusté au cadre au départ, taille native (1:1), zoom molette centré
 * sur le curseur, déplacement à la souris/au doigt, double-clic = bascule ajusté ⇄ 1:1.
 */
@Component({
  selector: 'app-image-viewer',
  imports: [DecimalPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './image-viewer.html',
  styleUrl: './image-viewer.css'
})
export class ImageViewer implements OnDestroy {
  readonly file = input.required<ModelFile>();

  readonly src = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly natural = signal<{ w: number; h: number } | null>(null);
  readonly scale = signal(1);
  readonly tx = signal(0);
  readonly ty = signal(0);
  /** En mode ajusté, l'image suit les redimensionnements du cadre. */
  readonly fitted = signal(true);
  readonly dragging = signal(false);

  readonly transform = computed(() => `translate(${this.tx()}px, ${this.ty()}px) scale(${this.scale()})`);

  private readonly frame = viewChild.required<ElementRef<HTMLDivElement>>('frame');
  private sub: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private drag: { x: number; y: number; tx: number; ty: number } | null = null;

  constructor(private readonly api: ApiService) {
    effect(() => {
      const file = this.file();
      untracked(() => this.load(file));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.revoke();
  }

  onLoad(img: HTMLImageElement): void {
    this.natural.set({ w: img.naturalWidth, h: img.naturalHeight });
    this.fit();
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.fitted() && this.fit());
      this.resizeObserver.observe(this.frame().nativeElement);
    }
  }

  /** Image entière visible, sans agrandir au-delà de la taille native. */
  fit(): void {
    const n = this.natural();
    if (!n) return;
    const { width, height } = this.frameSize();
    const s = Math.min(1, width / n.w, height / n.h);
    this.setView(s, (width - n.w * s) / 2, (height - n.h * s) / 2);
    this.fitted.set(true);
  }

  /** Taille native, centrée sur le point (cx, cy) du cadre (centre par défaut). */
  actualSize(cx?: number, cy?: number): void {
    const { width, height } = this.frameSize();
    this.zoomAt(1 / this.scale(), cx ?? width / 2, cy ?? height / 2);
  }

  zoomBy(factor: number): void {
    const { width, height } = this.frameSize();
    this.zoomAt(factor, width / 2, height / 2);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const { x, y } = this.localPoint(event);
    this.zoomAt(event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, x, y);
  }

  onDblClick(event: MouseEvent): void {
    const { x, y } = this.localPoint(event);
    if (this.fitted() && this.scale() < 1) this.actualSize(x, y);
    else this.fit();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = { x: event.clientX, y: event.clientY, tx: this.tx(), ty: this.ty() };
    this.dragging.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drag) return;
    this.tx.set(this.drag.tx + event.clientX - this.drag.x);
    this.ty.set(this.drag.ty + event.clientY - this.drag.y);
    this.fitted.set(false);
  }

  onPointerUp(): void {
    this.drag = null;
    this.dragging.set(false);
  }

  private zoomAt(factor: number, cx: number, cy: number): void {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale() * factor));
    const ratio = s / this.scale();
    this.setView(s, cx - (cx - this.tx()) * ratio, cy - (cy - this.ty()) * ratio);
    this.fitted.set(false);
  }

  private setView(s: number, tx: number, ty: number): void {
    this.scale.set(s);
    this.tx.set(tx);
    this.ty.set(ty);
  }

  private frameSize(): { width: number; height: number } {
    const el = this.frame().nativeElement;
    return { width: el.clientWidth, height: el.clientHeight };
  }

  private localPoint(event: MouseEvent): { x: number; y: number } {
    const rect = this.frame().nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private load(file: ModelFile): void {
    this.sub?.unsubscribe();
    this.revoke();
    this.natural.set(null);
    this.error.set(null);
    this.sub = this.api.modelFile(file).subscribe({
      next: (blob) => this.src.set(URL.createObjectURL(blob)),
      error: () => this.error.set("Impossible de récupérer l'image")
    });
  }

  private revoke(): void {
    const src = this.src();
    if (src) URL.revokeObjectURL(src);
    this.src.set(null);
  }
}
