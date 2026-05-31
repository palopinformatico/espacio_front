import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-theme',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './theme.component.html',
  styleUrls: ['./theme.component.css']
})
export class ThemeComponent implements OnInit {

  themes: any[] = [];
  theme: any = null;

  previewImg: string | null = null;
  fileToUpload: File | null = null;

  // --- Professional Gradients ---
  gradientPresets = [
    { name: "Midnight", value: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)" },
    { name: "Sunset", value: "linear-gradient(135deg, #ff7e5f, #feb47b)" },
    { name: "Ocean", value: "linear-gradient(135deg, #2193b0, #6dd5ed)" },
    { name: "Purple", value: "linear-gradient(135deg, #8e2de2, #4a00e0)" },
    { name: "Forest", value: "linear-gradient(135deg, #134e5e, #71b280)" },
    { name: "Dark Gray", value: "linear-gradient(135deg, #232526, #414345)" }
  ];

  // --- Professional Color Schemes ---
  colorPresets = [
    {
      name: "Default Orange",
      primary: "#ff7f00",
      secondary: "#6c757d",
      backgroundColor: "#2a2e35",
    },
    {
      name: "Modern Blue",
      primary: "#007bff",
      secondary: "#6c757d",
      backgroundColor: "#f4f6f9",
    },
    {
      name: "Dark Elegant",
      primary: "#d4af37", // Gold
      secondary: "#343a40",
      backgroundColor: "#121212",
    },
    {
      name: "Forest Green",
      primary: "#28a745",
      secondary: "#155724",
      backgroundColor: "#f1f8e9",
    },
    {
      name: "Cyberpunk",
      primary: "#00ff9d",
      secondary: "#ff0055",
      backgroundColor: "#0b0b0f",
    }
  ];

  constructor(private themeService: ThemeService) { }

  ngOnInit() {
    this.loadThemes();
  }

  loadThemes() {
    this.themeService.getThemes().subscribe((res: any[]) => {
      this.themes = res;
      if (res.length) {
        // Initialize with the first theme found or default
        this.theme = { ...res[0] };
        console.log('📥 Tema cargado del backend:', this.theme);
        this.preview();
      }
    });
  }

  selectThemeById(id: number) {
    const found = this.themes.find(t => t.id == id);
    if (found) {
      this.theme = { ...found };
      this.previewImg = this.theme.backgroundImage || null;
      console.log('🔄 Tema seleccionado:', this.theme);
      this.preview();
    }
  }

  fileSelected(ev: any) {
    const file = ev.target.files[0];
    if (!file) return;

    this.fileToUpload = file;

    const reader = new FileReader();
    reader.onload = e => this.previewImg = e.target?.result as string;
    reader.readAsDataURL(file);

    this.preview();
  }

  applyGradientPreset(g: any) {
    this.theme.gradient = g.value;
    this.preview();
  }

  applyColorPreset(p: any) {
    console.log('🎨 Aplicando preset:', p.name);

    this.theme.primaryColor = p.primary;
    this.theme.secondaryColor = p.secondary;
    this.theme.backgroundColor = p.backgroundColor;

    console.log('✅ Theme actualizado:', {
      primaryColor: this.theme.primaryColor,
      secondaryColor: this.theme.secondaryColor,
      backgroundColor: this.theme.backgroundColor
    });

    this.preview();
  }

  preview() {
    console.log('🖼️ Ejecutando preview() con:', {
      backgroundColor: this.theme.backgroundColor,
      backgroundType: this.theme.backgroundType,
      mode: this.theme.mode
    });

    const root = document.documentElement;

    // 1. Core Colors
    if (this.theme.primaryColor) {
      root.style.setProperty('--primary-color', this.theme.primaryColor);
    }
    if (this.theme.secondaryColor) {
      root.style.setProperty('--secondary-color', this.theme.secondaryColor);
    }

    // 2. Background Logic based on backgroundType
    // Reset all first
    root.style.setProperty('--bg-body', this.theme.backgroundColor || '#30393a');
    root.style.setProperty('--background-gradient', 'none');
    root.style.setProperty('--background-image', 'none');

    if (this.theme.backgroundType === 'gradient' && this.theme.gradient) {
      root.style.setProperty('--background-gradient', this.theme.gradient);
    } else if (this.theme.backgroundType === 'image' && this.previewImg) {
      root.style.setProperty('--background-image', `url(${this.previewImg})`);
    }
    // If 'color', it just uses the --bg-body set above

    // 3. Mode Logic (Derive bgCard since it's not in DB)
    let bgCardValue = '#3b3f47'; // Default dark
    let textMainValue = '#f4f4f4'; // Default light text

    if (this.theme.mode === 'light') {
      bgCardValue = '#ffffff';
      textMainValue = '#212529';
    } else if (this.theme.mode === 'glass') {
      bgCardValue = 'rgba(255, 255, 255, 0.1)'; // Glass effect
      // You might want to add backdrop-filter in CSS if not present
      root.style.setProperty('--backdrop-filter', 'blur(10px)');
    } else {
      // Dark mode default
      bgCardValue = '#1e1e1e';
      textMainValue = '#f4f4f4';
    }

    root.style.setProperty('--bg-card', bgCardValue);
    root.style.setProperty('--text-main', textMainValue);

    // 4. Border Radius
    root.style.setProperty('--border-radius',
      this.theme.borderStyle === 'rounded' ? '12px' : '0px'
    );

    // 5. Shadows
    root.style.setProperty('--card-shadow',
      this.theme.cardShadow === 'deep'
        ? '0 10px 20px rgba(0,0,0,0.3)'
        : this.theme.cardShadow === 'normal'
          ? '0 4px 6px rgba(0,0,0,0.1)'
          : 'none'
    );

    console.log('✅ Preview completado');
  }

  resetPreview() {
    this.previewImg = null;
    this.theme.gradient = '';
    this.preview();
  }

  save() {
    if (!this.theme.id) {
      alert("Debe seleccionar un tema.");
      return;
    }

    const payload = { ...this.theme };
    delete payload.id;

    // Remove frontend-only CSS variables that backend doesn't accept
    delete (payload as any).bgBody;
    delete (payload as any).bgCard;
    delete (payload as any).bgHeader;
    delete (payload as any).bgInput;
    delete (payload as any).textMain;
    delete (payload as any).textMuted;
    delete (payload as any).textHeader;
    delete (payload as any).borderColor;

    this.themeService.updateTheme(this.theme.id, payload).subscribe(() => {
      if (this.fileToUpload) {
        this.themeService.uploadBackground(this.theme.id, this.fileToUpload).subscribe(() => {
          alert("Guardado OK + imagen subida");
          this.loadThemes();
        });
      } else {
        alert("Guardado OK");
        this.loadThemes();
      }
    });
  }
}
