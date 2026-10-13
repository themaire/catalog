export interface Category {
  id: number;
  name: string;
  rightLevel: number;
}

export interface ModelSummary {
  id: number;
  name: string;
  addedAt: string;
  downloads: number;
  thumbnail: string | null;
  category: string;
}

export interface ModelFile {
  id: number;
  name: string;
  type: string;
  /** Chemin relatif au modèle (dossier ou intérieur de l'archive) */
  path: string;
  size: number;
  /** Endpoint d'extraction du fichier (nécessite le token si catégorie restreinte) */
  url: string;
}

export interface ModelDetail {
  id: number;
  name: string;
  addedAt: string;
  downloads: number;
  printed: boolean;
  notes: string | null;
  category: string;
  path: string;
  files: ModelFile[];
}
