export interface Theme {
  id: number;

  // -----------------------------
  //  BASICS
  // -----------------------------
  name: string;
  isDefault: boolean;

  // -----------------------------
  //  BRAND COLORS
  // -----------------------------
  primaryColor: string;
  secondaryColor: string;

  // -----------------------------
  //  EXTENDED CSS VARIABLES
  // -----------------------------
  bgBody?: string;        // --bg-body
  bgCard?: string;        // --bg-card
  bgHeader?: string;      // --bg-header
  bgInput?: string;       // --bg-input
  textMain?: string;      // --text-main
  textMuted?: string;     // --text-muted
  textHeader?: string;    // --text-header
  borderColor?: string;   // --border-color

  // -----------------------------
  //  BACKGROUND SYSTEM PRO
  // -----------------------------
  backgroundType: 'color' | 'gradient' | 'image';   // <— NUEVO Y NECESARIO
  backgroundColor: string;                          // fallback sólido
  gradient?: string;                                // linear-gradient(...)
  backgroundImage?: string;                         // /uploads/....

  // Opciones premium opcionales
  backgroundOpacity?: number;   // 0–1   (especial para modo glass)
  backgroundBlur?: number;      // px    (efecto frosted glass)
  backgroundSize?: string;      // "cover" | "contain" | "auto"
  backgroundPosition?: string;  // "center", "top", "left", etc
  backgroundRepeat?: string;    // "no-repeat", "repeat"

  // -----------------------------
  //  UI MODES
  // -----------------------------
  mode: 'light' | 'dark' | 'glass';

  // -----------------------------
  //  SHAPES & DEPTH
  // -----------------------------
  borderStyle: 'rounded' | 'square';
  cardShadow: 'none' | 'normal' | 'deep';

  // -----------------------------
  //  LAYOUT
  // -----------------------------
  layoutType: 'full' | 'boxed' | 'minimal' | 'glass';

  // -----------------------------
  //  RESERVED FOR FUTURE PRO USE
  // -----------------------------
  customCSS?: string;            // inyección de CSS por tema
  createdAt?: string;
  updatedAt?: string;
}
