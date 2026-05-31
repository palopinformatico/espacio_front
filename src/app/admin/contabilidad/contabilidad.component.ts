import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApexChart,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexLegend,
  ApexDataLabels,
  NgApexchartsModule,
  ApexStroke,
  ApexYAxis,
  ApexFill,
  ApexGrid,
  ApexTooltip,
  ApexMarkers,
  ApexPlotOptions
} from 'ng-apexcharts';
import { GastosService } from '../../services/gastos.service';

export interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  fill: ApexFill;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
  colors: string[];
  plotOptions?: ApexPlotOptions;
  labels?: string[];
}

@Component({
  selector: 'app-contabilidad',
  standalone: true,
  templateUrl: './contabilidad.component.html',
  styleUrl: './contabilidad.component.css',
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule, NgApexchartsModule],
})
export class ContabilidadComponent implements OnInit {
  activeTab = 'finanzas';
  currentRange = 'semana';
  start?: string;
  end?: string;

  // KPIs Finanzas
  kpisFinanzas = {
    ingresos: 0,
    egresos: 0,
    propinas: 0,
    balance: 0,
    costoDelivery:0,
    porCobrar: 0,
    ticketBar: 0
  };

  // KPIs Clientes
  kpisClientes = {
    total: 0,
    nuevos: 0,
    recurrentes: 0
  };

  // KPIs Delivery
  kpisDelivery = {
    pedidos: 0,
    pagados: 0,
    pendientes: 0,
    tiempoPromedio: 0,
    puntualidad: 0,
    recaudado: 0,
    costoEnvio: 0
  };

  // KPIs Gastos
  kpisGastos = {
    total: 0,
    categoriaTop: '',
    categoriaTopMonto: 0,
    medioTop: '',
    medioTopMonto: 0
  };

  //KPI COSTO_DELIVERY
    kpisCosto_delivery ={

    }

  // Charts
  chartMensual: any = null;
  chartEvolucion: any = null;
  chartTopDias: any = null;
  chartDistribucion: any = null;
  chartIngresosEgresos: any = null;

  chartMesasIngresos: any = null;
  chartMesasHoras: any = null;

  chartProductosTop: any = null;
  chartProductosCategoria: any = null;

  chartClientesNuevosVsRecurrentes: any = null;
  chartClientesActividad: any = null;
  chartClientesTopGasto: any = null;
  chartClientesTopPedidos: any = null;
  chartClientesTicketPromedio: any = null;
  chartClientesFrecuencia: any = null;

  chartDeliveryPedidos: any = null;
  chartDeliveryTiempo: any = null;
  chartDeliveryEstados: any = null;
  chartDeliveryRecaudacion: any = null;
  chartDeliveryClientes: any = null;
  chartDeliveryTopBarrios: any = null;

  chartGastosCategoria: any = null;
  chartGastosMedioPago: any = null;
  chartGastosEvolucion: any = null;

  constructor(private gastosService: GastosService, private decimalPipe: DecimalPipe) { }

  ngOnInit() {
    this.applyRange('semana');
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  applyRange(range: string) {
    this.currentRange = range;

    let start: Date;
    let end: Date;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago'
    });
        
    const format = (date: Date) => 
      date.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

    switch (range) {
      case 'hoy':
        this.start = today;
        this.end = today;
        break;
      case 'semana':
        const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo, retroceder 6 días

        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);

        const sunday = new Date(now);
        sunday.setDate(now.getDate() + (6 - diffToMonday));

        this.start = this.formatDateLocal(monday);
        this.end = this.formatDateLocal(sunday);
        break;
      case 'mes':
        this.start = format(new Date(year, month, 1));
        this.end = format(new Date(year, month + 1, 0));
        break;
      case 'anio':
        this.start = format(new Date(year, 0, 1));
        this.end = format(new Date(year, 11, 31));
        break;
      case 'personalizado':
        if (!this.start || !this.end) {
          this.start = format(new Date(year, month, 1));
          this.end = format(new Date(year, month + 1, 0));
        }
        break;
    }

    this.loadAllRealData();
  }

  formatMonto(value: number): string {
    if (value == null || isNaN(value)) return '$0';
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('es-CL');
    return value < 0 ? `-$${formatted}` : `$${formatted}`;
  }

  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadAllRealData() {
    this.loadFinanzasKpis();
    this.loadFinanzasCharts();

    this.loadMesasCharts();
    this.loadProductosCharts();
    this.loadClientesKpis();
    this.loadClientesCharts();
    this.loadDeliveryKpis();
    this.loadDeliveryCharts();
    this.loadGastosKpis();
    this.loadGastosCharts();
  }

  // ==================== FINANZAS ====================

  loadFinanzasKpis() {
    this.gastosService.getKpisFinanzas(this.start, this.end).subscribe({
      next: (data) => {
        this.kpisFinanzas = data;
      },
      error: (err) => {
        console.error('Error al cargar KPIs de finanzas:', err);
        this.kpisFinanzas = {
          ingresos: 0,
          egresos: 0,
          propinas: 0,
          balance: 0,
          costoDelivery:0,
          porCobrar: 0,
          ticketBar: 0
        };
      }
    });
  }

  loadFinanzasCharts() {
    // Balance días
    this.gastosService.getBalanceDias(this.start, this.end).subscribe({
      next: (data) => {
        const iva = data.ingresos.map((ing: number) => ing * 0.19);
        console.log('🔍 Balance días - IVA calculado:', iva);
        console.log('🔍 Balance días - Ingresos:', data.ingresos);
        this.chartMensual = this.buildMultiLineChart(
          data.labels,
          data.ingresos,
          data.egresos,
          data.propinas,
          data.balance,
          iva,
          data.costoDelivery || data.labels.map(() => 0)
        );
      },
      error: (err) => {
        console.error('Error al cargar balance por días:', err);
      }
    });

    // Evolución
    this.gastosService.getEvolucionFinanzas(this.start, this.end).subscribe({
      next: (data) => {
        const iva = data.balance.map((bal: number) => bal * 0.19);
        console.log('🔍 Evolución - IVA calculado:', iva);
        console.log('🔍 Evolución - Balance:', data.balance);
        this.chartEvolucion = this.buildGroupedBarChart(
          data.labels,
          [
            { name: 'Balance', data: data.balance },
            { name: 'Por Cobrar', data: data.porCobrar },
            { name: 'IVA (19%)', data: iva },
            { name: 'Propinas', data: data.propinas || data.labels.map(() => 0) },
            { name: 'Costo Delivery', data: data.costoDelivery || data.labels.map(() => 0) }
          ]
        );
      },
      error: (err) => {
        console.error('Error al cargar evolución:', err);
      }
    });

    // Top días
    this.gastosService.getTopDias(this.start, this.end, 5).subscribe({
      next: (data) => {
        this.chartTopDias = this.buildBarChart(
          data.map(d => d.recaudacion),
          data.map(d => d.dia)
        );
      },
      error: (err) => {
        console.error('Error al cargar top días:', err);
      }
    });

    // Distribución
    this.gastosService.getDistribucionFinanzas(this.start, this.end).subscribe({
      next: (data) => {
        console.log('🔍 Distribución Finanzas - Backend data:', data);
        console.log('🔍 Ingresos:', data.ingresos);
        console.log('🔍 Propinas:', data.propinas);
        console.log('🔍 Costo Delivery:', data.costoDelivery);

        this.chartDistribucion = this.buildDonutChart(
          [data.ingresos, data.propinas, data.costoDelivery || 0],
          ['Ingresos', 'Propinas', 'Costo Delivery']
        );
      },
      error: (err) => {
        console.error('Error al cargar distribución:', err);
      }
    });

    // Ingresos vs Egresos (Balance)
    this.gastosService.getKpisFinanzas(this.start, this.end).subscribe({
      next: (data) => {
        const balance = data.ingresos - data.egresos;
        this.chartIngresosEgresos = this.buildDonutChartWithBalance(
          [data.ingresos, data.egresos],
          ['Ingresos', 'Egresos'],
          320,
          true,
          ['#4ade80', '#ef4444'],
          balance
        );
      },
      error: (err) => {
        console.error('Error al cargar ingresos vs egresos:', err);
      }
    });
  }

  // ==================== MESAS ====================

  loadMesasCharts() {
    this.gastosService.getIngresosPorMesa(this.start, this.end, 10).subscribe({
      next: (data) => {
        this.chartMesasIngresos = this.buildBarChart(
          data.map(d => d.ingresos),
          data.map(d => d.mesa)
        );
      },
      error: (err) => {
        console.error('Error al cargar ingresos por mesa:', err);
      }
    });

    this.gastosService.getHorasPuntaPorMesa(this.start, this.end).subscribe({
      next: (data) => {
        this.chartMesasHoras = this.buildGenericAreaChart(
          [{ name: 'Ocupación', data: data.map(d => d.ocupacion) }],
          data.map(d => `${d.hora}:00`),
          ['#ff7f00']
        );
      },
      error: (err) => {
        console.error('Error al cargar horas punta por mesa:', err);
      }
    });
  }

  // ==================== PRODUCTOS ====================

  loadProductosCharts() {
    this.gastosService.getTopProductos(this.start, this.end, 10).subscribe({
      next: (data) => {
        this.chartProductosTop = this.buildBarChart(
          data.map(d => d.total),
          data.map(d => d.producto)
        );
      },
      error: (err) => {
        console.error('Error al cargar top productos:', err);
      }
    });

    this.gastosService.getIngresosPorCategoria(this.start, this.end).subscribe({
      next: (data) => {
        this.chartProductosCategoria = this.buildDonutChart(
          data.map(d => d.ingresos),
          data.map(d => d.categoria)
        );
      },
      error: (err) => {
        console.error('Error al cargar ingresos por categoría:', err);
      }
    });
  }

  // ==================== CLIENTES ====================

  loadClientesKpis() {
    this.gastosService.getKpisClientes(this.start, this.end).subscribe({
      next: (data) => {
        this.kpisClientes = data;
      },
      error: (err) => {
        console.error('Error al cargar KPIs de clientes:', err);
        this.kpisClientes = {
          total: 0,
          nuevos: 0,
          recurrentes: 0
        };
      }
    });
  }

  loadClientesCharts() {
    // Nuevos vs Recurrentes
    this.gastosService.getNuevosRecurrentesClientes(this.start, this.end).subscribe({
      next: (data) => {
        this.chartClientesNuevosVsRecurrentes = this.buildDonutChart(
          [data.nuevos, data.recurrentes],
          ['Nuevos', 'Recurrentes'],
          240,
          false  // Sin signo de peso porque es cantidad de clientes
        );
      },
      error: (err) => {
        console.error('Error al cargar nuevos vs recurrentes:', err);
      }
    });

    this.gastosService.getActividadClientes(this.start, this.end).subscribe({
      next: (data) => {
        this.chartClientesActividad = this.buildGenericAreaChart(
          [
            { name: 'Clientes Nuevos', data: data.nuevos },
            { name: 'Recurrentes', data: data.recurrentes }
          ],
          data.labels,
          ['#34d399', '#3b82f6'],
          240
        );
      },
      error: (err) => {
        console.error('Error al cargar actividad de clientes:', err);
      }
    });

    // Top Clientes por Gasto (limitado a 7 para mejor visualización en gráfico compacto)
    this.gastosService.getTopClientesGasto(this.start, this.end, 50).subscribe({
      next: (data) => {
        console.log('📊 Top Clientes Gasto - Data recibida:', data);

        if (data && data.clientes && data.clientes.length > 0) {
          // Agrupar por cliente (case-insensitive) y sumar gastos
          const clientesMap = new Map<string, { cliente: string, gasto: number }>();

          data.clientes.forEach((item: any) => {
            const clienteKey = item.cliente.toLowerCase().trim();
            const existing = clientesMap.get(clienteKey);

            if (existing) {
              existing.gasto += Number(item.gasto || 0);
            } else {
              clientesMap.set(clienteKey, {
                cliente: item.cliente,
                gasto: Number(item.gasto || 0)
              });
            }
          });

          // Convertir Map a array, ordenar y tomar top 7
          const topClientes = Array.from(clientesMap.values())
            .sort((a, b) => b.gasto - a.gasto)
            .slice(0, 7);

          console.log('📊 Top Clientes Gasto - Agrupados:', topClientes);

          if (topClientes.length > 0) {
            this.chartClientesTopGasto = this.buildBarChart(
              topClientes.map(d => d.gasto),
              topClientes.map(d => d.cliente),
              220,
              'Gasto Total'
            );
            console.log('📊 Top Clientes Gasto - Chart creado:', this.chartClientesTopGasto);
          } else {
            console.warn('⚠️ Top Clientes Gasto - No hay datos después de agrupar');
            this.chartClientesTopGasto = null;
          }
        } else {
          console.warn('⚠️ Top Clientes Gasto - Data vacía o nula');
          this.chartClientesTopGasto = null;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar top clientes por gasto:', err);
        this.chartClientesTopGasto = null;
      }
    });

    // Top Clientes por Pedidos (limitado a 7 para mejor visualización en gráfico compacto)
    this.gastosService.getTopClientesPedidos(this.start, this.end, 50).subscribe({
      next: (data) => {
        console.log('📊 Top Clientes Pedidos - Data recibida:', data);

        if (data && data.clientes && data.clientes.length > 0) {
          // Agrupar por cliente (case-insensitive) y sumar pedidos
          const clientesMap = new Map<string, { cliente: string, pedidos: number }>();

          data.clientes.forEach((item: any) => {
            const clienteKey = item.cliente.toLowerCase().trim();
            const existing = clientesMap.get(clienteKey);

            if (existing) {
              existing.pedidos += Number(item.pedidos || 0);
            } else {
              clientesMap.set(clienteKey, {
                cliente: item.cliente,
                pedidos: Number(item.pedidos || 0)
              });
            }
          });

          // Convertir Map a array, ordenar y tomar top 7
          const topClientes = Array.from(clientesMap.values())
            .sort((a, b) => b.pedidos - a.pedidos)
            .slice(0, 7);

          console.log('📊 Top Clientes Pedidos - Agrupados:', topClientes);

          if (topClientes.length > 0) {
            this.chartClientesTopPedidos = this.buildHorizontalBarChart(
              topClientes.map(d => d.pedidos),
              topClientes.map(d => d.cliente),
              '#3b82f6',
              220,
              'Cantidad de Pedidos',
              'pedidos'
            );
            console.log('📊 Top Clientes Pedidos - Chart creado:', this.chartClientesTopPedidos);
          } else {
            console.warn('⚠️ Top Clientes Pedidos - No hay datos después de agrupar');
            this.chartClientesTopPedidos = null;
          }
        } else {
          console.warn('⚠️ Top Clientes Pedidos - Data vacía o nula');
          this.chartClientesTopPedidos = null;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar top clientes por pedidos:', err);
        this.chartClientesTopPedidos = null;
      }
    });

    // Frecuencia de Compra (incluye ticket promedio)
    this.gastosService.getFrecuenciaClientes(this.start, this.end).subscribe({
      next: (data) => {
        // Gráfico de frecuencia (donut chart con distribución por número de pedidos)
        this.chartClientesFrecuencia = this.buildDonutChart(
          data.frecuenciaPorNumPedidos.map(f => f.clientes),
          data.frecuenciaPorNumPedidos.map(f => `${f.numPedidos} pedido${f.numPedidos > 1 ? 's' : ''}`),
          220,
          false  // Sin signo de peso porque es cantidad de clientes
        );

        // Gráfico de ticket promedio (KPI card style)
        this.chartClientesTicketPromedio = this.buildTicketPromedioCard(data.ticketPromedio, 220);
      },
      error: (err) => {
        console.error('Error al cargar frecuencia de clientes:', err);
      }
    });
  }

  // ==================== DELIVERY ====================

  loadDeliveryKpis() {
    this.gastosService.getKpisDelivery(this.start, this.end).subscribe({
      next: (data) => {
        this.kpisDelivery = data;
      },
      error: (err) => {
        console.error('Error al cargar KPIs de delivery:', err);
        this.kpisDelivery = {
          pedidos: 0,
          pagados: 0,
          pendientes: 0,
          tiempoPromedio: 0,
          puntualidad: 0,
          recaudado: 0,
          costoEnvio: 0
        };
      }
    });
  }

  loadDeliveryCharts() {
    // Pedidos por día
    this.gastosService.getPedidosDeliveryPorDia(this.start, this.end).subscribe({
      next: (data) => {
        this.chartDeliveryPedidos = this.buildGenericAreaChart(
          [{ name: 'Pedidos', data: data.pedidos }],
          data.labels,
          ['#ff7f00']
        );
      },
      error: (err) => {
        console.error('Error al cargar pedidos por día:', err);
      }
    });

    // Tiempo de despacho
    this.gastosService.getTiempoDespacho(this.start, this.end).subscribe({
      next: (data) => {
        this.chartDeliveryTiempo = this.buildGenericAreaChart(
          [{ name: 'Tiempo promedio (min)', data: data.tiempoPromedio }],
          data.labels,
          ['#3b82f6'],
          320
        );
      },
      error: (err) => {
        console.error('Error al cargar tiempo de despacho:', err);
      }
    });

    // Estados de pedidos
    this.gastosService.getEstadosDelivery(this.start, this.end).subscribe({
      next: (data) => {
        console.log('🔍 Estados Delivery - Backend data:', data);
        console.log('🔍 Pagado:', data.pagado);
        console.log('🔍 Pendiente:', data.pendiente);
        console.log('🔍 Cancelado:', data.cancelado);

        // Convertir a números para asegurar el tipo correcto
        const pagado = Number(data.pagado) || 0;
        const pendiente = Number(data.pendiente) || 0;
        const cancelado = Number(data.cancelado) || 0;

        console.log('🔍 Valores convertidos:', { pagado, pendiente, cancelado });

        this.chartDeliveryEstados = this.buildDonutChart(
          [pagado, pendiente, cancelado],
          ['Pagado', 'Pendiente', 'Cancelado'],
          340,  // Altura aumentada para círculo donut más grande (85%)
          false,  // Sin signo de peso porque es cantidad de pedidos
          ['#10b981', '#f59e0b', '#ef4444']  // Verde (Pagado), Amarillo (Pendiente), Rojo (Cancelado)
        );
      },
      error: (err) => {
        console.error('Error al cargar estados de delivery:', err);
      }
    });

    // Recaudación Delivery
    this.gastosService.getRecaudacionDelivery(this.start, this.end).subscribe({
      next: (data) => {
        this.chartDeliveryRecaudacion = this.buildBarChart(
          data.recaudacion,
          data.labels,
          320,
          'Recaudación'
        );
      },
      error: (err) => {
        console.error('Error al cargar recaudación delivery:', err);
      }
    });

    // Clientes: Nuevos vs Recurrentes
    this.gastosService.getClientesDelivery(this.start, this.end).subscribe({
      next: (data) => {
        this.chartDeliveryClientes = this.buildDonutChart(
          [data.nuevos, data.recurrentes],
          ['Nuevos', 'Recurrentes'],
          320,
          false  // Sin signo de peso porque es cantidad de clientes
        );
      },
      error: (err) => {
        console.error('Error al cargar clientes delivery:', err);
      }
    });

    // Top Barrios
    this.gastosService.getTopBarrios(this.start, this.end, 10).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.chartDeliveryTopBarrios = this.buildHorizontalBarChart(
            data.map(d => d.pedidos),
            data.map(d => d.barrio),
            '#f59e0b',
            320,
            'Pedidos',
            'pedidos'
          );
        }
      },
      error: (err) => {
        console.error('Error al cargar top barrios:', err);
      }
    });
  }

  // ==================== GASTOS ====================

  loadGastosKpis() {
    this.gastosService.getKpisGastos(this.start, this.end).subscribe({
      next: (data) => {
        this.kpisGastos = data;
      },
      error: (err) => {
        console.error('Error al cargar KPIs de gastos:', err);
        this.kpisGastos = {
          total: 0,
          categoriaTop: '',
          categoriaTopMonto: 0,
          medioTop: '',
          medioTopMonto: 0
        };
      }
    });
  }

  loadGastosCharts() {
    // Por categoría
    this.gastosService.getGastosPorCategoria(this.start, this.end).subscribe({
      next: (data) => {
        this.chartGastosCategoria = this.buildDonutChart(
          data.map(d => d.monto),
          data.map(d => d.categoria)
        );
      },
      error: (err) => {
        console.error('Error al cargar gastos por categoría:', err);
      }
    });

    this.gastosService.getGastosPorMedioPago(this.start, this.end).subscribe({
      next: (data) => {
        this.chartGastosMedioPago = this.buildDonutChart(
          data.map(d => d.monto),
          data.map(d => d.medio)
        );
      },
      error: (err) => {
        console.error('Error al cargar gastos por medio de pago:', err);
      }
    });

    // Evolución de gastos
    this.gastosService.getEvolucionGastos(this.start, this.end).subscribe({
      next: (data) => {
        this.chartGastosEvolucion = this.buildGenericAreaChart(
          [{ name: 'Gastos', data: data.gastos }],
          data.labels,
          ['#ef4444'],  // Color rojo para gastos/egresos
          420  // Altura aumentada para gráfico más grande y visible
        );
      },
      error: (err) => {
        console.error('Error al cargar evolución de gastos:', err);
      }
    });
  }

  // ==================== CHART BUILDERS ====================

  private getChartCommonOptions(): Partial<ApexChart> {
    return {
      fontFamily: 'Inter, system-ui, sans-serif',
      foreColor: '#9ca3af',
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
      animations: {
        enabled: true,
        speed: 800
      }
    };
  }

  private getGridOptions(): ApexGrid {
    return {
      borderColor: 'rgba(255, 255, 255, 0.05)',
      strokeDashArray: 4,
      padding: { top: 0, right: 0, bottom: 0, left: 10 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    };
  }

  private getTooltipOptions(): ApexTooltip {
    return {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'Inter, sans-serif' },
      x: { show: true },
      marker: { show: true },
      fixed: {
        enabled: false,
        position: 'topRight',
        offsetX: 0,
        offsetY: 0,
      }
    };
  }

  buildMultiLineChart(
    labels: string[],
    ingresos: number[],
    egresos: number[],
    propinas: number[],
    balance: number[],
    iva: number[],
    costoDelivery: number[]
  ) {
    return {
      series: [
        { name: 'Ingresos', data: ingresos },
        { name: 'Egresos', data: egresos },
        { name: 'Propinas', data: propinas },
        { name: 'Balance', data: balance },
        { name: 'IVA (19%)', data: iva },
        { name: 'Costo Delivery', data: costoDelivery }
      ],
      chart: {
        type: 'area',
        height: 320,
        ...this.getChartCommonOptions()
      },
      colors: ['#4ade80', '#ef4444', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: 3,
        lineCap: 'round'
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px', fontWeight: 500 },
          offsetY: 5
        },
        tooltip: { enabled: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px' },
          formatter: (val: number) => {
            if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
            if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}k`;
            return `$${val}`;
          }
        }
      },
      grid: this.getGridOptions(),
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        offsetY: -30,
        labels: { colors: '#d1d5db' },
        markers: { radius: 12 },
        itemMargin: { horizontal: 15, vertical: 0 }
      },
      tooltip: {
        ...this.getTooltipOptions(),
        y: { formatter: (val: number) => `$${val.toLocaleString('es-CL')}` }
      },
      markers: { size: 0, hover: { size: 6, sizeOffset: 3 } }
    };
  }

  buildGroupedBarChart(labels: string[], series: { name: string, data: number[] }[]) {
    return {
      series: series,
      chart: {
        type: 'bar',
        height: 320,
        ...this.getChartCommonOptions()
      },
      colors: ['#fbbf24', '#f87171', '#60a5fa', '#a78bfa'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '50%',
          borderRadius: 4,
          borderRadiusApplication: 'end'
        }
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 4, colors: ['transparent'] },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px', fontWeight: 500 },
          offsetY: 5
        }
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px' },
          formatter: (val: number) => {
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
            return `$${val}`;
          }
        }
      },
      grid: this.getGridOptions(),
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        offsetY: -20,
        labels: { colors: '#d1d5db' }
      },
      tooltip: {
        ...this.getTooltipOptions(),
        y: { formatter: (val: number) => `$${val.toLocaleString('es-CL')}` }
      }
    };
  }

  buildBarChart(data: number[], labels: string[], height: number = 320, seriesName: string = 'Recaudación') {
    return {
      series: [{ name: seriesName, data: data }],
      chart: {
        type: 'bar',
        height: height,
        ...this.getChartCommonOptions()
      },
      colors: ['#ff7f00'],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 4,
          borderRadiusApplication: 'end',
          distributed: false
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px' },
          formatter: (val: number) => {
            if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
            return `$${val}`;
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#e5e7eb', fontSize: '13px', fontWeight: 600 },
          maxWidth: 160
        }
      },
      grid: this.getGridOptions(),
      tooltip: {
        ...this.getTooltipOptions(),
        y: { formatter: (val: number) => `$${val.toLocaleString('es-CL')}` }
      }
    };
  }

  buildDonutChart(series: number[], labels: string[], height: number = 320, showCurrency: boolean = true, customColors?: string[]) {
    return {
      series: series,
      chart: {
        type: 'donut',
        height: height,
        ...this.getChartCommonOptions()
      },
      labels: labels,
      colors: customColors || ['#4ade80', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'],
      legend: {
        position: 'bottom',
        offsetY: 5,
        labels: { colors: '#d1d5db', fontSize: '13px' },
        itemMargin: { horizontal: 8, vertical: 4 },
        markers: { radius: 10 }
      },
      dataLabels: { enabled: false }, // Cleaner look
      plotOptions: {
        pie: {
          startAngle: 0,
          endAngle: 360,
          expandOnClick: true,
          donut: {
            size: '85%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: '#9ca3af',
                offsetY: -15
              },
              value: {
                show: true,
                fontSize: '36px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                color: '#ffffff',
                offsetY: 20,
                formatter: (val: number) => {
                  const numVal = parseInt(val.toString());
                  return showCurrency
                    ? `$${numVal.toLocaleString('es-CL')}`
                    : numVal.toString();
                }
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Total',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: '#9ca3af',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => {
                    return Number(a) + Number(b);
                  }, 0);
                  return showCurrency
                    ? `$${total.toLocaleString('es-CL')}`
                    : total.toString();
                }
              }
            }
          }
        }
      },
      tooltip: {
        ...this.getTooltipOptions(),
        y: {
          formatter: (val: number) => showCurrency
            ? `$${val.toLocaleString('es-CL')}`
            : val.toString()
        }
      },
      stroke: { show: false }
    };
  }

  buildDonutChartWithBalance(series: number[], labels: string[], height: number = 320, showCurrency: boolean = true, customColors?: string[], balance: number = 0) {
    return {
      series: series,
      chart: {
        type: 'donut',
        height: height,
        ...this.getChartCommonOptions()
      },
      labels: labels,
      colors: customColors || ['#4ade80', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'],
      legend: {
        position: 'bottom',
        offsetY: 5,
        labels: { colors: '#d1d5db', fontSize: '13px' },
        itemMargin: { horizontal: 8, vertical: 4 },
        markers: { radius: 10 }
      },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          startAngle: 0,
          endAngle: 360,
          expandOnClick: true,
          donut: {
            size: '85%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: '#9ca3af',
                offsetY: -15
              },
              value: {
                show: true,
                fontSize: '36px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                color: balance >= 0 ? '#4ade80' : '#ef4444',
                offsetY: 20,
                formatter: (val: number) => {
                  return showCurrency
                    ? `$${balance.toLocaleString('es-CL')}`
                    : balance.toString();
                }
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Balance',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: '#9ca3af',
                formatter: () => {
                  return showCurrency
                    ? `$${balance.toLocaleString('es-CL')}`
                    : balance.toString();
                }
              }
            }
          }
        }
      },
      tooltip: {
        ...this.getTooltipOptions(),
        y: {
          formatter: (val: number) => showCurrency
            ? `$${val.toLocaleString('es-CL')}`
            : val.toString()
        }
      },
      stroke: { show: false }
    };
  }

  buildGenericAreaChart(
    series: { name: string, data: number[] }[],
    categories: string[],
    colors: string[],
    height: number = 320
  ) {
    return {
      series: series,
      chart: {
        type: 'area',
        height: height,
        ...this.getChartCommonOptions()
      },
      colors: colors,
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      xaxis: {
        categories: categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px' },
          offsetY: 5
        },
        tooltip: { enabled: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px' },
          formatter: (val: number) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
            return `${val}`;
          }
        }
      },
      grid: this.getGridOptions(),
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        offsetY: -30,
        labels: { colors: '#d1d5db' },
        markers: { radius: 12 },
        itemMargin: { horizontal: 10 }
      },
      tooltip: {
        ...this.getTooltipOptions(),
        y: { formatter: (val: number) => `${val.toLocaleString('es-CL')}` }
      },
      markers: { size: 0, hover: { size: 6 } }
    };
  }

  buildHorizontalBarChart(data: number[], labels: string[], color: string, height: number = 320, seriesName: string = 'Pedidos', tooltipSuffix: string = 'pedidos') {
    return {
      series: [{ name: seriesName, data: data }],
      chart: {
        type: 'bar',
        height: height,
        ...this.getChartCommonOptions()
      },
      colors: [color],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 4,
          borderRadiusApplication: 'end',
          distributed: false
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: {
          style: { colors: '#9ca3af', fontSize: '12px' },
          formatter: (val: number) => {
            if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
            return `${val}`;
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#e5e7eb', fontSize: '13px', fontWeight: 600 },
          maxWidth: 160
        }
      },
      grid: this.getGridOptions(),
      tooltip: {
        ...this.getTooltipOptions(),
        y: { formatter: (val: number) => `${val.toLocaleString('es-CL')} ${tooltipSuffix}` }
      }
    };
  }

  buildTicketPromedioCard(ticketPromedio: number, height: number = 280) {
    return {
      series: [100],
      chart: {
        type: 'radialBar',
        height: height,
        ...this.getChartCommonOptions()
      },
      plotOptions: {
        radialBar: {
          hollow: {
            size: '70%',
            background: 'transparent'
          },
          track: {
            background: 'rgba(255, 255, 255, 0.05)',
            strokeWidth: '100%'
          },
          dataLabels: {
            name: {
              show: true,
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              color: '#9ca3af',
              offsetY: -10
            },
            value: {
              show: true,
              fontSize: '28px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              color: '#ffffff',
              offsetY: 10,
              formatter: () => `$${ticketPromedio.toLocaleString('es-CL')}`
            }
          }
        }
      },
      colors: ['#4ade80'],
      labels: ['Ticket Promedio'],
      stroke: { lineCap: 'round' }
    };
  }
}
