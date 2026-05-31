import { Component, OnInit, inject } from '@angular/core';

import { ApexAxisChartSeries, NgApexchartsModule } from 'ng-apexcharts';
import { GastosService } from '../services/gastos.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-grafico-gastos',
  standalone: true,
  imports: [ NgApexchartsModule,CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './grafico-gastos.component.html'
})
export class GraficoGastosComponent implements OnInit {
    private gastoService = inject(GastosService);
    private auth = inject(AuthService);

    isAdmin = true;
  type = 'egreso';
  periodo = 'mes';
  valor = new Date().toISOString().substring(0, 7); // yyyy-MM

  chartSeries: ApexAxisChartSeries = [];
  chartOpts: any = {
    chart: { type: 'line', height: 350, toolbar: { show: false } },
    xaxis: { categories: [] },
    stroke: { width: 3, curve: 'smooth' },
    dataLabels: { enabled: false },
    yaxis: { labels: { formatter: (v: any) => `$${v}` } }
  };

    /** Inserted by Angular inject() migration for backwards compatibility */
    constructor(...args: unknown[]);

  constructor() {}

  ngOnInit() {
    this.loadChart();
    const user = this.auth.getUser();
  this.isAdmin = user?.role === 'admin';
  }

  loadChart() {
  if (!this.type || !this.periodo || !this.valor) return;

  this.gastoService.getEstadisticas(this.type, this.periodo, this.valor).subscribe(data => {

    this.chartSeries = [
      { name: 'Ingresos', data: data.ingresos ?? [], color: '#00c853' },
      { name: 'Egresos', data: data.egresos ?? [], color: '#d50000' },
      { name: 'Propinas', data: data.propinas ?? [], color: '#00b0ff' },
      { name: 'Balance', data: data.balance ?? [], color: '#ffab00' },
    ];

    this.chartOpts = {
      chart: {
        type: 'line',
        height: 350,
        foreColor: '#fff',           // texto del chart en blanco
        toolbar: { 
          show: true,
          tools: { download: true }
        },
        animations: { enabled: true, easing: 'easeinout', speed: 400 },
        background: '#1e1e2f'        // fondo dark
      },

      tooltip: {
        theme: 'dark',
        style: { fontSize: '13px', fontFamily: 'Roboto', color: '#fff' },
        marker: { show: true },
        x: { show: true },
        y: {
          formatter: (v: number) => `$${v.toLocaleString()}`
        }
      },

      xaxis: {
        categories: data.labels ?? [],
        labels: {
          style: { colors: '#fff' }
        },
        axisBorder: { color: '#555' },
        axisTicks: { color: '#555' }
      },

      yaxis: {
        labels: { style: { colors: '#fff' } },
        axisBorder: { color: '#555' },
        axisTicks: { color: '#555' }
      },

      stroke: {
        width: 3,
        curve: 'smooth'
      },

      grid: {
        borderColor: '#444',
        strokeDashArray: 4
      },

      legend: {
        position: 'top',
        labels: {
          colors: '#fff',
          useSeriesColors: false
        }
      },

      dataLabels: { enabled: false }
    };
  });
}


}