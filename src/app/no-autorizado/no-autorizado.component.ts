import { Component, HostListener, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'app-no-autorizado',
  templateUrl: './no-autorizado.component.html',
  styleUrls: ['./no-autorizado.component.css']
})
export class NoAutorizadoComponent {
  private el = inject(ElementRef);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);


  constructor() {}

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const code = this.el.nativeElement.querySelector('#code403');
    const x = (event.clientX - window.innerWidth / 2) / 25;
    const y = (event.clientY - window.innerHeight / 2) / 25;
    code.style.transform = `translate(${x}px, ${y}px)`;
  }
}
