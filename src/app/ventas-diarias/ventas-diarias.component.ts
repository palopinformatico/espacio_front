import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { OrdenService } from '../services/orden.service';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-ventas-diarias',
  templateUrl: './ventas-diarias.component.html',
   standalone: true,
  imports: [ FormsModule,CommonModule,DatePipe],
  styleUrls: ['./ventas-diarias.component.css']
})
export class VentasDiariasComponent implements OnInit, OnDestroy {
 private orderService = inject(OrdenService);

 desde = '';
  hasta = '';
  tipoPedido = '';
  totalPropinasHoy = 0;
  totalVentasHoy = 0;
  totalVentasAyer = 0;
  cantidadPedidosHoy = 0;
  ventas: any[] = [];

  ultimaActualizacion: Date = new Date();
  chart: any;
  intervaloAutoRefresco: any;

 /** Inserted by Angular inject() migration for backwards compatibility */
constructor() {}

  ngOnInit(): void {
    this.buscarVentas();
    this.intervaloAutoRefresco = setInterval(() => this.buscarVentas(), 5 * 60 * 1000); // 🔄 cada 5 min
  }

  ngOnDestroy(): void {
    if (this.intervaloAutoRefresco) clearInterval(this.intervaloAutoRefresco);
  }

buscarVentas() {
  this.orderService.getVentasDiarias(this.desde, this.hasta, this.tipoPedido).subscribe({
    next: (data) => {

      this.totalVentasHoy = data.totalVentas || 0;
      this.cantidadPedidosHoy = data.cantidadPedidos || 0;
      this.totalVentasAyer = data.totalAyer || 0;

      // ✅ NUEVO (propinas totales)
      this.totalPropinasHoy = data.totalPropinas || 0;

      // ✅ NUEVO: propina por cada venta
      this.ventas = data.detalles?.map((v: { propina: any; }) => ({
        ...v,
        propina: v.propina ?? 0
      })) || [];

      // ⚡️ Solo actualiza el gráfico si hay datos
      if (Array.isArray(data.grafico) && data.grafico.length > 0) {
        this.actualizarGrafico(data.grafico);
      } else {
        console.warn('⚠️ Sin datos para el gráfico de ventas');
        this.actualizarGrafico([]); // Limpia el gráfico
      }

      this.ultimaActualizacion = new Date();
    },
    error: (err) => console.error('Error cargando ventas', err)
  });
}


  actualizarGrafico(data: any[]) {
  const horas = data.map(x => x.hora);
  const totales = data.map(x => Number(x.total));
  const propinas = data.map(x => Number(x.propina));

  if (this.chart) this.chart.destroy();

  this.chart = new Chart('ventasChart', {
    type: 'line',
    data: {
      labels: horas,
      datasets: [
        {
          label: 'Total Ventas',
          data: totales,
          borderWidth: 3,
          tension: 0.3
        },
        {
          label: 'Propinas',
          data: propinas,
          borderWidth: 3,
          borderDash: [5, 5],
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

formatPrice(value: number): string {
  if (value == null) return '';
  // convierte el número a string con separador de miles
  return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

}
