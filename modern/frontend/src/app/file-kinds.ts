/** Type d'aperçu d'un fichier de modèle, selon son extension (champ `type` de l'API). */
export type PreviewKind = '3d' | 'image' | 'text' | 'pdf' | 'none';

const KINDS: Record<Exclude<PreviewKind, 'none'>, string[]> = {
  // Formats lus par online-3d-viewer
  '3d': ['stl', 'obj', '3mf', 'step', 'stp', 'iges', 'igs', 'ply', 'amf', 'off', 'glb', 'gltf', 'fbx', '3ds', 'dae'],
  image: ['jpg', 'jpeg', 'png', 'gif'],
  text: ['txt', 'url', 'html', 'gcode', 'mtl'],
  pdf: ['pdf']
};

const BY_TYPE = new Map<string, PreviewKind>(
  Object.entries(KINDS).flatMap(([kind, types]) => types.map((t) => [t, kind as PreviewKind]))
);

export function previewKind(type: string): PreviewKind {
  return BY_TYPE.get(type?.toLowerCase()) ?? 'none';
}

export const KIND_ICONS: Record<PreviewKind, string> = {
  '3d': 'view_in_ar',
  image: 'image',
  text: 'description',
  pdf: 'picture_as_pdf',
  none: 'insert_drive_file'
};
