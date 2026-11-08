export type Look = {
  n: number; name: string; distill: string; haiku: string[]; reading: string;
  garment: string; model: string; place_he: string; place_en: string; light: string; camera: string;
  prompt_he: string; prompt_en: string; motion_en: string;
  image_url: string; video_url: string; video_kind: '' | 'studio' | 'mj' | 'upload';
};
export type Content = {
  name: string; insight: string; manifesto: string[]; haiku: string[]; reading: string;
  signature: { name: string; text: string };
  principles: { title: string; text: string }[];
  palette: { hex: string; name: string }[];
  set: { concept: string; text: string; place_he: string; place_en: string };
  looks: Look[];
};
export type Collection = { id: string; created_at: string; updated_at: string; status: 'draft' | 'published'; content: Content; model?: string };
export type LinkRow = { id?: string; season: string; house: string; city_he?: string; city_en?: string; idea: string; url: string };
