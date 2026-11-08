export type Shot = 'sketch' | 'model' | 'editorial';
export type Media = { id: string; look_id: string; kind: 'image' | 'video'; source: 'draft' | 'mj' | 'film' | 'upload'; stage?: Shot | 'film' | null; url: string; path?: string; is_primary: boolean; created_at: string };
export type Stage = 'prompt' | 'sketch' | 'model' | 'editorial' | 'film' | 'ready';
export type Prompt = { he: string; en: string; body_he?: string; body_en?: string };
export type Look = {
  id: string; collection_id: string; n: number; name: string; distill: string; haiku: string[]; reading: string;
  garment: { text?: string }; model: string; place_he: string; place_en: string; light: string; camera: string;
  prompt_he: string; prompt_en: string; motion_en: string; stage: Stage; media: Media[];
  prompts?: Partial<Record<Shot, Prompt>>;
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
  { id: 'prompt', label: 'פרומפט' }, { id: 'sketch', label: 'סקיצה' }, { id: 'model', label: 'מודל' }, { id: 'editorial', label: 'מגזין' }, { id: 'film', label: 'סרטון' }, { id: 'ready', label: 'מוכן' },
];
export const SHOTS: { id: Shot; label: string; note: string }[] = [
  { id: 'sketch', label: 'סקיצה', note: 'פחם ודיו, קווי בנייה' },
  { id: 'model', label: 'מודל', note: 'נפח לבן, צללית שחורה' },
  { id: 'editorial', label: 'מגזין', note: 'הבגד הסופי, רקע הדף' },
];
export const SOURCE_LABEL: Record<Media['source'], string> = { draft: 'טיוטה', mj: 'מידג\'רני', film: 'סרטון מסלול', upload: 'העלאה' };

const stageOf = (m: Media) => m.stage ?? (m.kind === 'video' ? 'film' : 'editorial');
/** The lead media of one stage (sketch, model, editorial or film). */
export const lead = (l: Look, stage: Shot | 'film') => {
  const all = l.media.filter((m) => stageOf(m) === stage);
  return all.find((m) => m.is_primary) ?? all.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
};
/** The image that stands for the look: the magazine photo first, then the model, then the sketch. */
export const primary = (l: Look, kind: Media['kind']) => (kind === 'video' ? lead(l, 'film') : lead(l, 'editorial') ?? lead(l, 'model') ?? lead(l, 'sketch'));
export const stageIndex = (s: Stage) => STAGES.findIndex((x) => x.id === s);
export const accentOf = (c: Collection) => c.palette[4]?.hex ?? '#5E1F24';
