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
  name: string;
  type: string;
  path: string;
  size: number;
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
