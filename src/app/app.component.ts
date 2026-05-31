import { Component, Inject, inject, OnInit, Renderer2 } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  private themeService = inject(ThemeService);
  //private horariosService = inject(HorariosService);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

    ngOnInit() {
    // Crea o encuentra la metaetiqueta
    this.checkRestaurantAvailability();
  }

  checkRestaurantAvailability() {
    /*this.horariosService.checkRestaurantAvailability().subscribe({
      next: (response: any) => {
        console.log('Estado del restaurante:', response);
        // Aquí puedes actualizar la lógica del botón principal según el estado
        // Por ejemplo, si response.available = false, deshabilitar botón, etc.
      },
      error: (error: any) => {
        console.error('Error checking restaurant availability:', error);
      }
    });*/
  }
  



   visible = false;

  open() {
    this.visible = true;
  }

  close() {
    this.visible = false;
  }
}

