// functions/src/index.ts
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const CURRENCY_BEACON_API_KEY = defineSecret('CURRENCY_BEACON_API_KEY');

export const api = onRequest({ cors: true, secrets: [CURRENCY_BEACON_API_KEY] }, async (req: any, res: any) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json; charset=utf-8');

  const path = req.path; // np. '/api/convert' przy rewrite
  const apiKey = CURRENCY_BEACON_API_KEY.value();

  try {
    if (path.endsWith('/convert')) {
      const { from, to, amount } = req.query as Record<string, string>;
      if (!from || !to || !amount) {
        return res.status(400).json({ error: 'Brak parametrów: from,to,amount' });
      }

      const url = new URL('https://api.currencybeacon.com/v1/convert');
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      url.searchParams.set('amount', amount);

      const r = await fetch(url.toString());
      const data = await r.json().catch(() => ({}));
      return res.status(r.ok ? 200 : 502).json(data);
    }

    if (path.endsWith('/currencies')) {
      const url = new URL('https://api.currencybeacon.com/v1/currencies');
      url.searchParams.set('api_key', apiKey);

      const r = await fetch(url.toString());
      const data = await r.json().catch(() => ({}));

      // Normalizacja do `{ response: Currency[] }`
      let body = data;
      const resp = data?.response;
      if (resp && typeof resp === 'object' && !Array.isArray(resp)) {
        const arr = Object.entries(resp).map(([code, v]: [string, any]) => ({
          code,
          name: v?.name ?? v?.name_plural ?? v?.label ?? code,
        }));
        body = { response: arr };
      }
      return res.status(r.ok ? 200 : 502).json(body);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Unexpected error' });
  }
});
