import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/currency-converter/components/currency-converter.component').then(m => m.CurrencyConverterComponent)
  }
];
