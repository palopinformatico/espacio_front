import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AdminVentasComponent } from './admin-ventas.component';

describe('AdminVentasComponent', () => {
  let component: AdminVentasComponent;
  let fixture: ComponentFixture<AdminVentasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, AdminVentasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminVentasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
