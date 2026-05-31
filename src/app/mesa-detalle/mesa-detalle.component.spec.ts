import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MesaDetalleComponent } from './mesa-detalle.component';
import { MesaService } from '../services/mesa.service';
import { OrdenService } from '../services/orden.service';
import { ProductService } from '../services/product.service';
import { CategoriaService } from '../services/categoria.service';
import { SocketService } from '../services/socket.service';

// Minimal fakes for injected services used by the component
class MesaServiceStub {
  getMesa = jasmine.createSpy('getMesa').and.returnValue(of({ id: 1, status: 'Libre' }));
  getDetalleMesas = jasmine.createSpy('getDetalleMesas').and.returnValue(of({}));
  marcarPedidoPagado = jasmine.createSpy('marcarPedidoPagado').and.returnValue(of({}));
  getPedidosActuales = jasmine.createSpy('getPedidosActuales').and.returnValue(of([]));
}

class OrdenServiceStub {
  ordenesActualizadas$ = new Subject<void>();
  obtenerOrdenesPorMesa = jasmine.createSpy('obtenerOrdenesPorMesa').and.returnValue(of([]));
  crearOrdenPorMesa = jasmine.createSpy('crearOrdenPorMesa').and.returnValue(of({ numeroVenta: 123, id: 9 }));
  agregarProductosAOrden = jasmine.createSpy('agregarProductosAOrden').and.returnValue(of({}));
  cancelarProducto = jasmine.createSpy('cancelarProducto').and.returnValue(of({}));
  deleteOrder = jasmine.createSpy('deleteOrder').and.returnValue(of({}));
  getHistorialPorMesaYDia = jasmine.createSpy('getHistorialPorMesaYDia').and.returnValue(of([]));
  obtenerOrdenEspecifica = jasmine.createSpy('obtenerOrdenEspecifica').and.returnValue(of({}));
  actualizarOrdenPorMesa = jasmine.createSpy('actualizarOrdenPorMesa').and.returnValue(of({}));
  notificarCambioOrdenes = jasmine.createSpy('notificarCambioOrdenes');
}

class ProductServiceStub {
  getAllProducts = jasmine.createSpy('getAllProducts').and.returnValue(of([]));
}

class CategoriaServiceStub {
  obtenerCategorias = jasmine.createSpy('obtenerCategorias').and.returnValue(of([]));
}

class SocketServiceStub {
  onNewOrder = jasmine.createSpy('onNewOrder').and.returnValue(of());
  onOrderUpdated = jasmine.createSpy('onOrderUpdated').and.returnValue(of());
  onMesaUpdated = jasmine.createSpy('onMesaUpdated').and.returnValue(of());
}

describe('MesaDetalleComponent', () => {
  let component: MesaDetalleComponent;
  let fixture: ComponentFixture<MesaDetalleComponent>;
  let ordenService: OrdenServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        MesaDetalleComponent
      ],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
        { provide: MesaService, useClass: MesaServiceStub },
        { provide: OrdenService, useClass: OrdenServiceStub },
        { provide: ProductService, useClass: ProductServiceStub },
        { provide: CategoriaService, useClass: CategoriaServiceStub },
        { provide: SocketService, useClass: SocketServiceStub },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesaDetalleComponent);
    component = fixture.componentInstance;

    // Replace injected services through injector using component's own tokens
    ordenService = TestBed.inject(OrdenService) as unknown as OrdenServiceStub;

    // Spy on browser APIs used by the component
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute subtotal from carrito items', () => {
    component['carrito'] = [
      { orderId: 1, numeroVenta: '1', orderType: 'Local', detalle_venta: null, total: 0, propina: 0, products: [
        { id: 10, name: 'A', cantidad: 2, price: 1000, subtotal: 2000 }
      ]},
      { orderId: 2, numeroVenta: '1', orderType: 'Local', detalle_venta: null, total: 0, propina: 0, products: [
        { id: 11, name: 'B', cantidad: 1, price: 3000, subtotal: 3000 }
      ]}
    ] as any;
    expect(component.getSubtotal()).toBe(5000);
  });

  it('should compute propina and total correctly', () => {
    component['carrito'] = [
      { orderId: 1, numeroVenta: '1', orderType: 'Local', detalle_venta: null, total: 0, propina: 500, products: [
        { id: 10, name: 'A', cantidad: 2, price: 1000, subtotal: 2000 }
      ]},
      { orderId: 2, numeroVenta: '1', orderType: 'Local', detalle_venta: null, total: 0, propina: 300, products: [
        { id: 11, name: 'B', cantidad: 1, price: 3000, subtotal: 3000 }
      ]}
    ] as any;

    expect(component.getPropina()).toBe(800);
    expect(component.getTotal()).toBe(5800);
  });

  it('should format price with thousand separators', () => {
    expect(component.formatPrice(1234567)).toBe('$1.234.567');
  });

  it('should call service to mark as paid and refresh data', () => {
    const mesaService = TestBed.inject(MesaService) as unknown as MesaServiceStub;
    spyOn(component as any, 'showToast');
    component['mesaId'] = 1;
    component['carrito'] = [{ products: [{ subtotal: 1000 }], orderId: 1, numeroVenta: '1', orderType: 'Local', detalle_venta: null, total: 1000, propina: 0 }] as any;

    component.marcarComoPagado();

    expect(mesaService.marcarPedidoPagado).toHaveBeenCalledWith(1);
  });

  it('should update quantity and sync with backend when increasing product quantity', () => {
    component['mesaId'] = 1;
    component['carrito'] = [{
      orderId: 9,
      numeroVenta: '1',
      orderType: 'Local',
      detalle_venta: null,
      total: 1000,
      propina: 0,
      products: [{ id: 10, name: 'Prod', cantidad: 1, price: 1000, subtotal: 1000 }]
    }] as any;

    component.actualizarCantidad(9, 10, 1);
    expect(ordenService.agregarProductosAOrden).toHaveBeenCalledWith(1, 9, [{ productId: 10, cantidad: 2 }]);
  });
});
