// ============================================================
// CATÁLOGO DE EJERCICIOS — Musculación con pesas
// ============================================================
// Para añadir un ejercicio: copia uno de los existentes y
// cambia id, name, group, equipment, primary, secondary.
// ============================================================

export type Muscle =
  | "chest" | "back" | "lats" | "traps" | "lowerBack"
  | "frontDelt" | "sideDelt" | "rearDelt"
  | "biceps" | "triceps" | "forearm"
  | "abs" | "obliques"
  | "quads" | "hamstrings" | "glutes" | "calves";

export type MuscleGroup =
  | "Pecho" | "Espalda" | "Hombros" | "Bíceps" | "Tríceps" | "Piernas" | "Abdomen";

export type Equipment =
  | "Barra" | "Mancuerna" | "Polea" | "Máquina" | "Banda" | "Peso corporal" | "Otro";

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  equipment: Equipment;
  primary: Muscle[];
  secondary: Muscle[];
}

export const EXERCISES: Exercise[] = [
  // PECHO
  { id: "bp_bb", name: "Press de banca (Barra)", group: "Pecho", equipment: "Barra", primary: ["chest"], secondary: ["frontDelt", "triceps"] },
  { id: "bp_db", name: "Press de banca (Mancuerna)", group: "Pecho", equipment: "Mancuerna", primary: ["chest"], secondary: ["frontDelt", "triceps"] },
  { id: "ip_bb", name: "Press inclinado (Barra)", group: "Pecho", equipment: "Barra", primary: ["chest"], secondary: ["frontDelt", "triceps"] },
  { id: "ip_db", name: "Press inclinado (Mancuerna)", group: "Pecho", equipment: "Mancuerna", primary: ["chest"], secondary: ["frontDelt", "triceps"] },
  { id: "dp_db", name: "Press declinado (Mancuerna)", group: "Pecho", equipment: "Mancuerna", primary: ["chest"], secondary: ["triceps"] },
  { id: "fly_db", name: "Aperturas (Mancuerna)", group: "Pecho", equipment: "Mancuerna", primary: ["chest"], secondary: [] },
  { id: "cc", name: "Cable Crossover", group: "Pecho", equipment: "Polea", primary: ["chest"], secondary: ["frontDelt"] },
  { id: "pec", name: "Pec Deck", group: "Pecho", equipment: "Máquina", primary: ["chest"], secondary: [] },
  { id: "dip", name: "Fondos en paralelas", group: "Pecho", equipment: "Peso corporal", primary: ["chest", "triceps"], secondary: ["frontDelt"] },

  // ESPALDA
  { id: "dl", name: "Peso muerto", group: "Espalda", equipment: "Barra", primary: ["lowerBack", "hamstrings", "glutes"], secondary: ["traps", "back"] },
  { id: "pull", name: "Dominadas", group: "Espalda", equipment: "Peso corporal", primary: ["lats", "back"], secondary: ["biceps"] },
  { id: "lat_pd", name: "Jalón al pecho", group: "Espalda", equipment: "Polea", primary: ["lats"], secondary: ["biceps", "back"] },
  { id: "row_bb", name: "Remo con barra", group: "Espalda", equipment: "Barra", primary: ["back", "lats"], secondary: ["biceps", "rearDelt"] },
  { id: "row_db", name: "Remo con mancuerna", group: "Espalda", equipment: "Mancuerna", primary: ["back", "lats"], secondary: ["biceps"] },
  { id: "row_seat", name: "Remo sentado en polea", group: "Espalda", equipment: "Polea", primary: ["back"], secondary: ["lats", "biceps"] },
  { id: "tbar", name: "Remo en T", group: "Espalda", equipment: "Barra", primary: ["back", "lats"], secondary: ["biceps"] },
  { id: "face", name: "Face Pull", group: "Espalda", equipment: "Polea", primary: ["rearDelt", "back"], secondary: [] },
  { id: "shrug_bb", name: "Encogimientos (Barra)", group: "Espalda", equipment: "Barra", primary: ["traps"], secondary: [] },
  { id: "shrug_db", name: "Encogimientos (Mancuerna)", group: "Espalda", equipment: "Mancuerna", primary: ["traps"], secondary: [] },
  { id: "pullover", name: "Pullover", group: "Espalda", equipment: "Mancuerna", primary: ["lats"], secondary: ["chest"] },

  // HOMBROS
  { id: "ohp", name: "Press militar (Barra)", group: "Hombros", equipment: "Barra", primary: ["frontDelt", "sideDelt"], secondary: ["triceps"] },
  { id: "sp_db", name: "Press hombro (Mancuerna)", group: "Hombros", equipment: "Mancuerna", primary: ["frontDelt", "sideDelt"], secondary: ["triceps"] },
  { id: "sp_m", name: "Press hombro (Máquina)", group: "Hombros", equipment: "Máquina", primary: ["frontDelt", "sideDelt"], secondary: ["triceps"] },
  { id: "lr_db", name: "Elevaciones laterales (Mancuerna)", group: "Hombros", equipment: "Mancuerna", primary: ["sideDelt"], secondary: [] },
  { id: "lr_cb", name: "Elevaciones laterales (Polea)", group: "Hombros", equipment: "Polea", primary: ["sideDelt"], secondary: [] },
  { id: "lr_band", name: "Elevaciones laterales (Banda)", group: "Hombros", equipment: "Banda", primary: ["sideDelt"], secondary: [] },
  { id: "fr_db", name: "Elevaciones frontales", group: "Hombros", equipment: "Mancuerna", primary: ["frontDelt"], secondary: [] },
  { id: "arnold", name: "Arnold Press", group: "Hombros", equipment: "Mancuerna", primary: ["frontDelt", "sideDelt"], secondary: ["triceps"] },
  { id: "rear_db", name: "Pájaros (Mancuerna)", group: "Hombros", equipment: "Mancuerna", primary: ["rearDelt"], secondary: [] },
  { id: "rear_pec", name: "Pájaros (Pec Deck inverso)", group: "Hombros", equipment: "Máquina", primary: ["rearDelt"], secondary: [] },
  { id: "upright", name: "Remo al mentón", group: "Hombros", equipment: "Barra", primary: ["sideDelt", "traps"], secondary: [] },

  // BÍCEPS
  { id: "curl_bb", name: "Curl con barra", group: "Bíceps", equipment: "Barra", primary: ["biceps"], secondary: ["forearm"] },
  { id: "curl_db", name: "Curl con mancuerna", group: "Bíceps", equipment: "Mancuerna", primary: ["biceps"], secondary: ["forearm"] },
  { id: "ham_db", name: "Curl martillo", group: "Bíceps", equipment: "Mancuerna", primary: ["biceps", "forearm"], secondary: [] },
  { id: "pre_bb", name: "Curl predicador", group: "Bíceps", equipment: "Barra", primary: ["biceps"], secondary: [] },
  { id: "curl_cb", name: "Curl en polea", group: "Bíceps", equipment: "Polea", primary: ["biceps"], secondary: ["forearm"] },
  { id: "curl_band", name: "Curl con banda", group: "Bíceps", equipment: "Banda", primary: ["biceps"], secondary: [] },
  { id: "conc", name: "Curl concentrado", group: "Bíceps", equipment: "Mancuerna", primary: ["biceps"], secondary: [] },

  // TRÍCEPS
  { id: "skull", name: "Skullcrusher", group: "Tríceps", equipment: "Barra", primary: ["triceps"], secondary: [] },
  { id: "tri_pd", name: "Extensión tríceps en polea", group: "Tríceps", equipment: "Polea", primary: ["triceps"], secondary: [] },
  { id: "tri_rope", name: "Extensión tríceps con cuerda", group: "Tríceps", equipment: "Polea", primary: ["triceps"], secondary: [] },
  { id: "tri_kick", name: "Patada de tríceps", group: "Tríceps", equipment: "Mancuerna", primary: ["triceps"], secondary: [] },
  { id: "cgbp", name: "Press cerrado (Barra)", group: "Tríceps", equipment: "Barra", primary: ["triceps", "chest"], secondary: ["frontDelt"] },
  { id: "tri_band", name: "Extensión tríceps (Banda)", group: "Tríceps", equipment: "Banda", primary: ["triceps"], secondary: [] },
  { id: "dip_b", name: "Fondos en banco", group: "Tríceps", equipment: "Peso corporal", primary: ["triceps"], secondary: ["frontDelt"] },

  // PIERNAS
  { id: "sq", name: "Sentadilla (Barra)", group: "Piernas", equipment: "Barra", primary: ["quads", "glutes"], secondary: ["hamstrings", "lowerBack"] },
  { id: "fsq", name: "Sentadilla frontal", group: "Piernas", equipment: "Barra", primary: ["quads"], secondary: ["glutes", "abs"] },
  { id: "lp", name: "Prensa de piernas", group: "Piernas", equipment: "Máquina", primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  { id: "lung_db", name: "Zancadas (Mancuerna)", group: "Piernas", equipment: "Mancuerna", primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  { id: "rdl", name: "Peso muerto rumano", group: "Piernas", equipment: "Barra", primary: ["hamstrings", "glutes"], secondary: ["lowerBack"] },
  { id: "rdl_db", name: "Peso muerto rumano (Mancuerna)", group: "Piernas", equipment: "Mancuerna", primary: ["hamstrings", "glutes"], secondary: ["lowerBack"] },
  { id: "lc", name: "Curl femoral", group: "Piernas", equipment: "Máquina", primary: ["hamstrings"], secondary: [] },
  { id: "le", name: "Extensión cuádriceps", group: "Piernas", equipment: "Máquina", primary: ["quads"], secondary: [] },
  { id: "calf_st", name: "Elevación gemelos de pie", group: "Piernas", equipment: "Máquina", primary: ["calves"], secondary: [] },
  { id: "calf_seat", name: "Elevación gemelos sentado", group: "Piernas", equipment: "Máquina", primary: ["calves"], secondary: [] },
  { id: "hip", name: "Hip Thrust", group: "Piernas", equipment: "Barra", primary: ["glutes"], secondary: ["hamstrings"] },
  { id: "bsq", name: "Sentadilla búlgara", group: "Piernas", equipment: "Mancuerna", primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  { id: "good", name: "Good Morning", group: "Piernas", equipment: "Barra", primary: ["hamstrings", "lowerBack"], secondary: ["glutes"] },

  // ABDOMEN
  { id: "cr_cb", name: "Crunch en polea", group: "Abdomen", equipment: "Polea", primary: ["abs"], secondary: [] },
  { id: "lr_h", name: "Elevación de piernas colgado", group: "Abdomen", equipment: "Peso corporal", primary: ["abs"], secondary: ["obliques"] },
  { id: "rt_w", name: "Russian Twist con peso", group: "Abdomen", equipment: "Mancuerna", primary: ["obliques", "abs"], secondary: [] },
  { id: "aw", name: "Ab Wheel", group: "Abdomen", equipment: "Otro", primary: ["abs"], secondary: ["lowerBack"] },
];

export const GROUPS: ("Todos" | MuscleGroup)[] = ["Todos", "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Piernas", "Abdomen"];
export const EQUIPMENT_LIST: ("Todo" | Equipment)[] = ["Todo", "Barra", "Mancuerna", "Polea", "Máquina", "Banda", "Peso corporal", "Otro"];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
