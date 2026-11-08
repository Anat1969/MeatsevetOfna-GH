export type Media = { id: string; look_id: string; kind: 'image' | 'video'; source: 'draft' | 'mj' | 'film' | 'upload'; url: string; path?: string; is_primary: boolean; created_at: string };
export type Stage = 'prompt' | 'shot' | 'film' | 'ready';
export type Look = {
  id: string; collection_id: string; n: number; name: string; distill: string; haiku: string[]; reading: string;
  garment: { text?: string }; model: string; place_he: string; place_en: string; light: string; camera: string;
  prompt_he: string; prompt_en: string; motion_en: string; stage: Stage; media: Media[];
};
export type Swatch = { hex: string; name: string };
export type Collection = {
  id: string; created_at: string; updated_at: string; published_at?: string | null; status: 'draft' | 'published';
  name: string; insight: string; manifesto: string[]; haiku: string[]; reading: string;
  signature: { name?: string; text?: string }; principles: { title: string; text: string }[];
  palette: Swatch[]; set_design: { concept?: string; text?: string; place_he?: string; place_en?: string };
  note?: string; model?: string; looks: Look[];
};
export type LinkRow = { id?: string; season: string; house: string; city_he?: string; city_en?: string; idea: string; url: string };

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'prompt', label: 'פרומפט' }, { id: 'shot', label: 'צילום' }, { id: 'film', label: 'סרטון' }, { id: 'ready', label: 'מוכן למסלול' },
];
export const SOURCE_LABEL: Record<Media['source'], string> = { draft: 'טיוטה', mj: 'מידג\'רני', film: 'סרטון מסלול', upload: 'העלאה' };

export const primary = (l: Look, kind: Media['kind']) => l.media.find((m) => m.kind === kind && m.is_primary) ?? l.media.filter((m) => m.kind === kind).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
export const stageIndex = (s: Stage) => STAGES.findIndex((x) => x.id === s);
export const accentOf = (c: Collection) => c.palette[4]?.hex ?? '#5E1F24';
