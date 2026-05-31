import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Theme } from "./models/theme.model";
import { SocketService } from "./socket.service";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private api = environment.api.themes;
  private current$ = new BehaviorSubject<Theme | null>(null);

  constructor(private http: HttpClient, private socket: SocketService) {
    this.loadDefault();

    // Realtime updates desde WebSocket
    this.socket.onThemeUpdates().subscribe(theme => {
      if (theme) {
        this.applyTheme(theme);
        this.current$.next(theme);
      }
    });
  }

  // =====================================================
  //                      API
  // =====================================================

  getThemes(): Observable<Theme[]> {
    return this.http.get<Theme[]>(this.api);
  }

  createTheme(data: Partial<Theme>) {
    return this.http.post<Theme>(this.api, data).pipe(
      tap(t => {
        this.applyTheme(t);
        this.current$.next(t);
      })
    );
  }

  updateTheme(id: number, data: Partial<Theme>) {
    return this.http.patch<Theme>(`${this.api}/${id}`, data).pipe(
      tap(t => {
        this.applyTheme(t);
        this.current$.next(t);
      })
    );
  }

  uploadBackground(id: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);

    return this.http.post<Theme>(`${this.api}/${id}/background`, fd).pipe(
      tap(t => {
        this.applyTheme(t);
        this.current$.next(t);
      })
    );
  }

  // =====================================================
  //                   DEFAULT THEME
  // =====================================================
  loadDefault() {
    this.http.get<Theme>(`${this.api}/default`).subscribe({
      next: t => {
        this.applyTheme(t);
        this.current$.next(t);
      },
      error: () => console.warn("No default theme found")
    });
  }

  getCurrent(): Observable<Theme | null> {
    return this.current$.asObservable();
  }

  // =====================================================
  //                  APPLY THEME GLOBAL
  // =====================================================
  applyTheme(theme: Theme) {
    const root = document.documentElement;

    // Core colors
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);

    // Extended CSS variables
    if (theme.bgBody) root.style.setProperty('--bg-body', theme.bgBody);
    if (theme.bgCard) root.style.setProperty('--bg-card', theme.bgCard);
    if (theme.bgHeader) root.style.setProperty('--bg-header', theme.bgHeader);
    if (theme.bgInput) root.style.setProperty('--bg-input', theme.bgInput);
    if (theme.textMain) root.style.setProperty('--text-main', theme.textMain);
    if (theme.textMuted) root.style.setProperty('--text-muted', theme.textMuted);
    if (theme.textHeader) root.style.setProperty('--text-header', theme.textHeader);
    if (theme.borderColor) root.style.setProperty('--border-color', theme.borderColor);

    // Fondo sólido
    root.style.setProperty('--background-color', theme.backgroundColor);

    // Fondo dinámico
    if (theme.backgroundType === 'gradient' && theme.gradient) {
      root.style.setProperty('--background-gradient', theme.gradient);
      root.style.setProperty('--background-image', 'none');

    } else if (theme.backgroundType === 'image' && theme.backgroundImage) {
      root.style.setProperty('--background-image', `url(${theme.backgroundImage})`);
      root.style.setProperty('--background-gradient', 'none');

    } else {
      root.style.setProperty('--background-image', 'none');
      root.style.setProperty('--background-gradient', 'none');
    }

    // Header
    if (theme.backgroundType === 'gradient' && theme.gradient) {
      root.style.setProperty('--header-bg-image', theme.gradient);
    } else if (theme.backgroundType === 'image' && theme.backgroundImage) {
      root.style.setProperty('--header-bg-image', `url(${theme.backgroundImage})`);
    } else {
      root.style.setProperty('--header-bg-image', 'none');
    }

    root.style.setProperty('--header-bg-color', theme.primaryColor);
    root.style.setProperty('--header-text-color', theme.mode === 'dark' ? '#fff' : '#000');

    // Border radius
    root.style.setProperty('--border-radius',
      theme.borderStyle === 'square' ? '0px' :
        theme.borderStyle === 'rounded' ? '12px' : '20px'
    );

    // Shadows
    root.style.setProperty('--card-shadow',
      theme.cardShadow === 'none'
        ? 'none'
        : theme.cardShadow === 'normal'
          ? '0 4px 6px rgba(0,0,0,0.1)'
          : '0 10px 20px rgba(0,0,0,0.3)'
    );

    root.style.setProperty('--card-shadow-hover',
      theme.cardShadow === 'none'
        ? 'none'
        : theme.cardShadow === 'normal'
          ? '0 6px 12px rgba(0,0,0,0.15)'
          : '0 15px 30px rgba(0,0,0,0.4)'
    );

    // Layout
    root.style.setProperty('--layout-width',
      theme.layoutType === 'full' ? '100%' :
        theme.layoutType === 'boxed' ? '1200px' : '800px'
    );
  }



  // =====================================================
  //                   APPLY PREVIEW (LIVE)
  // =====================================================
  applyPreview(partial: Partial<Theme>) {
    const root = document.documentElement;
    const body = document.body;

    this.applyColors(root, partial);
    this.applyModes(body, partial);
    this.applyLayout(body, partial);
    this.applyBackground(root, partial);     // <-- MISMA LÓGICA
    this.applyHeader(root, partial);
  }

  // =====================================================
  //              --- INTERNAL LOGIC PREMIUM ---
  // =====================================================

  // 1️⃣ Colores principales
  private applyColors(root: HTMLElement, data: Partial<Theme>) {
    if (data.primaryColor)
      root.style.setProperty('--primary-color', data.primaryColor ?? null);

    if (data.secondaryColor)
      root.style.setProperty('--secondary-color', data.secondaryColor ?? null);

    if (data.backgroundColor)
      root.style.setProperty('--background-color', data.backgroundColor ?? null);

    // Extended CSS variables
    if (data.bgBody)
      root.style.setProperty('--bg-body', data.bgBody ?? null);

    if (data.bgCard)
      root.style.setProperty('--bg-card', data.bgCard ?? null);

    if (data.bgHeader)
      root.style.setProperty('--bg-header', data.bgHeader ?? null);

    if (data.bgInput)
      root.style.setProperty('--bg-input', data.bgInput ?? null);

    if (data.textMain)
      root.style.setProperty('--text-main', data.textMain ?? null);

    if (data.textMuted)
      root.style.setProperty('--text-muted', data.textMuted ?? null);

    if (data.textHeader)
      root.style.setProperty('--text-header', data.textHeader ?? null);

    if (data.borderColor)
      root.style.setProperty('--border-color', data.borderColor ?? null);
  }

  // 2️⃣ Modo (light/dark/glass)
  private applyModes(body: HTMLElement, data: Partial<Theme>) {
    if (data.mode)
      body.setAttribute('data-mode', data.mode);
  }

  // 3️⃣ Layout + bordes + sombras
  private applyLayout(body: HTMLElement, data: Partial<Theme>) {
    if (data.layoutType)
      body.setAttribute('data-layout', data.layoutType);

    if (data.borderStyle)
      body.setAttribute('data-rounded', data.borderStyle);

    if (data.cardShadow)
      body.setAttribute('data-shadow', data.cardShadow);
  }

  // 4️⃣ Fondo con prioridad PRO
  private applyBackground(root: HTMLElement, theme: Partial<Theme>) {
    // fallback sólido
    if (theme.backgroundColor) {
      root.style.setProperty('--background-color', theme.backgroundColor ?? null);
    }

    // ¡prioridad total!
    //  gradient > image > color
    if (theme.backgroundType === 'gradient' && theme.gradient) {
      root.style.setProperty('--background-gradient', theme.gradient ?? null);
      root.style.setProperty('--background-image', 'none');
      return;
    }

    if (theme.backgroundType === 'image' && theme.backgroundImage) {
      root.style.setProperty('--background-image', `url(${theme.backgroundImage ?? ''})`);
      root.style.setProperty('--background-gradient', 'none');
      return;
    }

    // Fallback si no hay nada
    root.style.setProperty('--background-image', 'none');
    root.style.setProperty('--background-gradient', 'none');
  }

  // 5️⃣ Header (usa mismos fondos que el body)
  private applyHeader(root: HTMLElement, theme: Partial<Theme>) {
    root.style.setProperty('--header-bg-color', theme.primaryColor ?? '#000');

    if (theme.mode === 'dark') {
      root.style.setProperty('--header-text-color', '#fff');
    } else {
      root.style.setProperty('--header-text-color', '#000');
    }

    // Fondo en header
    if (theme.backgroundType === 'gradient' && theme.gradient) {
      root.style.setProperty('--header-bg-image', theme.gradient ?? null);
      return;
    }

    if (theme.backgroundType === 'image' && theme.backgroundImage) {
      root.style.setProperty('--header-bg-image', `url(${theme.backgroundImage ?? ''})`);
      return;
    }

    root.style.setProperty('--header-bg-image', 'none');
  }

}
