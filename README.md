# Espacio

Frontend para sistema de gestión de restaurantes. Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) versión 19.2.6.

## Tecnologías utilizadas

- **Angular 19.2.0** - Framework principal
- **NgRx** - Gestión de estado (@ngrx/store, @ngrx/effects)
- **Bootstrap 5** - Framework de UI
- **NgBootstrap** - Componentes de Bootstrap para Angular
- **Socket.io-client** - Comunicación en tiempo real
- **ApexCharts & Chart.js** - Visualización de datos
- **jsPDF** - Generación de documentos PDF
- **QRCode** - Generación de códigos QR
- **SweetAlert2** - Alertas personalizadas
- **RxJS** - Programación reactiva

## Servidor de desarrollo

Para iniciar el servidor de desarrollo local, ejecuta:

```bash
npm start
```

o

```bash
ng serve
```

Una vez que el servidor esté corriendo, abre tu navegador y navega a `http://localhost:4200/`. La aplicación se recargará automáticamente cada vez que modifiques cualquier archivo fuente.

## Generación de código

Angular CLI incluye herramientas poderosas para generar código. Para generar un nuevo componente, ejecuta:

```bash
ng generate component nombre-componente
```

Para una lista completa de los esquemas disponibles (como `components`, `directives`, o `pipes`), ejecuta:

```bash
ng generate --help
```

## Construcción

Para construir el proyecto, ejecuta:

```bash
npm run build
```

o

```bash
ng build
```

Esto compilará tu proyecto y almacenará los artefactos de construcción en el directorio `dist/`. Por defecto, la construcción de producción optimiza tu aplicación para rendimiento y velocidad.

## Ejecución de pruebas unitarias

Para ejecutar pruebas unitarias con el ejecutor de pruebas [Karma](https://karma-runner.github.io), usa el siguiente comando:

```bash
npm test
```

o

```bash
ng test
```

## Linting

Para ejecutar el linter y verificar el código:

```bash
npm run lint
```

## Recursos adicionales

Para más información sobre el uso de Angular CLI, incluyendo referencias detalladas de comandos, visita la página [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
