export interface Currency {
  id: string;
  name: string;
  short_code: string;
  code: string;
  precision: number;
  subunit: number;
  symbol: string;
  symbol_first: boolean;
  decimal_mark: string;
  thousands_separator: string;
}

export interface ConversionResponse {
  meta: {
    api_key: string;
    timestamp: number;
    base_currency_code: string;
    base_currency_name: string;
    amount: string;
    target_currency_code: string;
    target_currency_name: string;
  };
  response: {
    timestamp: number;
    base_currency_code: string;
    base_currency_name: string;
    amount: number;
    value: number;
    rates: {
      [key: string]: {
        currency_name: string;
        rate: string;
        rate_for_amount: string;
      };
    };
  };
}

export type ActiveSide = 'source' | 'target';

export type ConversionPayload = {
  from: string;
  to: string;
  amount: number;
};


export type ConversionQuery = Pick<ConversionPayload, 'from' | 'to'>;


export type Conversion = ConversionPayload & { direction: ActiveSide };
