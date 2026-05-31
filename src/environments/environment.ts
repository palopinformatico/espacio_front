const apiBase = 'http://localhost:3000/api/v1';

export const environment = {
  production: true,
  apiBase,
  
  // URLs específicas por módulo
  api: {
    orders: `${apiBase}/orders`,
    mesas: `${apiBase}/mesas`,
    auth: `${apiBase}/auth`,
    products: `${apiBase}/products`,
    categories: `${apiBase}/categorias`,
    users: `${apiBase}/users`,
    gastos: `${apiBase}/gastos`,
    costoEnvio: `${apiBase}/costo-envio`,
    categoriaGasto: `${apiBase}/categoria-gasto`,
    categoriaIngresos: `${apiBase}/categoria-ingresos`,
    clientesIngresos: `${apiBase}/clientes-ingresos`,
    ingresos: `${apiBase}/ingresos`,
    horarios: `${apiBase}/horarios`,
    ticketBar: `${apiBase}/ticket-bar`,
    proveedores: `${apiBase}/proveedores`,
    themes: `${apiBase}/themes`,
    ventasDiarias: `${apiBase}/orders/ventas/diariasMesa`,
  }
};