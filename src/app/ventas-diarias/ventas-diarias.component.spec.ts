import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { VentasDiariasComponent } from './ventas-diarias.component';

describe('VentasDiariasComponent', () => {
  let component: VentasDiariasComponent;
  let fixture: ComponentFixture<VentasDiariasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, VentasDiariasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VentasDiariasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
