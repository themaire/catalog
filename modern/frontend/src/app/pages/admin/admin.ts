import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { Category } from '../../models';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  categories = signal<Category[]>([]);
  domain = signal('');
  error = signal<string | null>(null);

  newCategoryName = '';
  newCategoryLevel = 1;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.error.set(null);
    this.api.adminCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.error.set('Impossible de charger les catégories admin')
    });
    this.api.domain().subscribe({
      next: (domain) => this.domain.set(domain.value),
      error: () => this.error.set('Impossible de charger le domaine')
    });
  }

  createCategory(): void {
    this.api.createCategory({ name: this.newCategoryName, rightLevel: this.newCategoryLevel }).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.newCategoryLevel = 1;
        this.reload();
      },
      error: () => this.error.set('Échec de création de catégorie')
    });
  }

  saveCategory(category: Category): void {
    this.api.updateCategory(category.id, { name: category.name, rightLevel: category.rightLevel }).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Échec de mise à jour de catégorie')
    });
  }

  removeCategory(id: number): void {
    this.api.deleteCategory(id).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Échec de suppression de catégorie')
    });
  }

  saveDomain(): void {
    this.api.updateDomain(this.domain()).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Échec de mise à jour du domaine')
    });
  }
}
