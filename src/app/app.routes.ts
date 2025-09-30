import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./currency-converter/feature/currency-converter.component').then(m => m.CurrencyConverterComponent)
  }
];
