import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoAutorizadoComponent } from './no-autorizado.component';

describe('NoAutorizadoComponent', () => {
  let component: NoAutorizadoComponent;
  let fixture: ComponentFixture<NoAutorizadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoAutorizadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoAutorizadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
