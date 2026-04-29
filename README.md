# 🏋️ Entrenar — Tu app de gym personal

PWA minimalista B&N para crear rutinas de musculación, registrar series y trackear tu progreso.
Stack: **Next.js 14 + Supabase + Tailwind**.

---

## 🚀 Setup en 10 minutos

### 1. Crear cuenta de Supabase
1. Ve a [supabase.com](https://supabase.com) y regístrate (gratis).
2. Click en **"New project"**.
3. Pon un nombre (ej. `gym-app`), genera una contraseña segura (guárdala) y elige la región más cercana (ej. `eu-west-1` para España).
4. Espera ~2 minutos a que se cree.

### 2. Crear las tablas
1. En tu proyecto de Supabase, abre el menú lateral → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto y **copia todo** el contenido.
3. Pégalo en el editor de Supabase y haz click en **"Run"** (o `Cmd+Enter`).
4. Si todo va bien, en **Table Editor** verás 5 tablas: `routines`, `routine_exercises`, `routine_sets`, `workouts`, `workout_sets`.

### 3. Conectar la app a Supabase
1. En Supabase, ve a **Project Settings** → **API**.
2. Copia estos dos valores:
   - **Project URL** (ejemplo: `https://abcdefgh.supabase.co`)
   - **anon public key** (la clave larga que empieza por `eyJ...`)
3. En la raíz del proyecto, copia `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Edita `.env.local` y pega los valores:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

### 4. Instalar y arrancar
```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Ya puedes crear una rutina.

---

## 📱 Instalar como PWA en tu iPhone

1. Despliega la app (siguiente sección) o usa `ngrok` para acceder desde el móvil al `localhost`.
2. Abre la URL en **Safari** (no Chrome — solo Safari permite instalar PWAs en iOS).
3. Toca el botón **Compartir** (cuadradito con flecha hacia arriba).
4. Baja y toca **"Añadir a pantalla de inicio"**.
5. Tendrás un icono propio que abre la app en pantalla completa, sin la barra del navegador.

---

## 🌍 Desplegar en Vercel (gratis)

1. Sube el código a GitHub:
   ```bash
   git init
   git add .
   git commit -m "first"
   git remote add origin https://github.com/tu-usuario/gym-app.git
   git push -u origin main
   ```
2. Ve a [vercel.com](https://vercel.com), inicia sesión con GitHub.
3. Click **"Add New Project"** → selecciona tu repo.
4. En **Environment Variables**, añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. En 1-2 min tendrás una URL tipo `https://gym-app-tu-usuario.vercel.app`.

---

## 📂 Estructura

```
src/
├── app/
│   ├── page.tsx                      # Home — lista de rutinas
│   ├── routine/
│   │   ├── new/page.tsx              # Crear nueva rutina
│   │   └── [id]/
│   │       ├── page.tsx              # Vista previa + botón Entrenar
│   │       └── edit/page.tsx         # Editar rutina existente
│   ├── workout/[id]/page.tsx         # Sesión de entrenamiento en vivo
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── AnatomyModel.tsx              # SVG cuerpo humano frontal+dorsal con highlights
│   ├── ExercisePicker.tsx            # Multi-select de ejercicios con filtros
│   └── RoutineEditor.tsx             # Editor compartido (new + edit)
├── data/
│   └── exercises.ts                  # Catálogo de ejercicios + músculos trabajados
└── lib/
    ├── supabase.ts                   # Cliente Supabase
    └── db.ts                         # Funciones para CRUD de rutinas y workouts
supabase/
└── schema.sql                        # Schema SQL para Supabase
```

---

## ➕ Añadir más ejercicios

Edita `src/data/exercises.ts`. Cada ejercicio es:

```ts
{
  id: "id_unico",                    // identificador único, sin espacios
  name: "Nombre del ejercicio",
  group: "Pecho",                    // grupo muscular principal
  equipment: "Mancuerna",            // material
  primary: ["chest"],                // músculos primarios (se pintan negros)
  secondary: ["frontDelt", "triceps"] // músculos secundarios (se pintan grises)
}
```

Músculos disponibles:
`chest, back, lats, traps, lowerBack, frontDelt, sideDelt, rearDelt, biceps, triceps, forearm, abs, obliques, quads, hamstrings, glutes, calves`

---

## 🔮 Ideas para extender

- **Historial de entrenamientos**: nueva pestaña que muestre los workouts pasados.
- **Gráficas de progresión**: peso por ejercicio a lo largo del tiempo (Recharts).
- **Cronómetro automático**: que el descanso suene cuando termine.
- **Superseries**: agrupar ejercicios.
- **Notas por ejercicio**: campo opcional para apuntar técnica.
- **Exportar a CSV**: por si quieres analizar tus datos.

---

## 🐛 Troubleshooting

**"Error al guardar"** — revisa que `.env.local` tiene bien las claves de Supabase y que ejecutaste el SQL del schema.

**Las imágenes anatómicas se ven raras** — son SVG vectoriales hechos a mano. Si quieres mejor calidad, considera comprar un pack de ilustraciones de fitness en Envato/Creative Market y reemplaza el componente `AnatomyModel`.

**El descanso suena demasiado bajo en iPhone** — actualmente solo es visual. Para añadir sonido, edita `src/app/workout/[id]/page.tsx` y añade un `new Audio('/beep.mp3').play()` cuando `restTimer.remaining === 0`.
