import { inject, Injectable } from '@angular/core';
import { ConversionPayload, ConversionResponse, Currency } from './currency.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({providedIn: 'root'})
export class CurrencyService {
  private readonly API_KEY = 'N9Jhwe63rt0W0FQRKRpp7MJ6LOr4LahG';
  private readonly BASE_URL = 'https://api.currencybeacon.com/v1';
  private readonly http = inject(HttpClient);


  convert({from, to, amount}: ConversionPayload): Observable<ConversionResponse> {
    return this.http.get<ConversionResponse>(`${this.BASE_URL}/convert?api_key=${this.API_KEY}&from=${from}&to=${to}&amount=${amount}`);
  }


  getCurrencies(): Observable<{ response: Currency[] }> {
    return this.http.get<{ response: Currency[] }>(
      `${this.BASE_URL}/currencies?api_key=${this.API_KEY}`
    );
  }

}
