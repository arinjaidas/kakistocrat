// data.gov.in resources the site uses. data.gov.in only answers requests from Indian IPs,
// so these are refreshed only when a request reaches a Cloudflare data centre in India,
// stored in KV (binding OGD), and read from anywhere (the GitHub build reads them here).
export const DATASETS = {
  mandi:     { rid: '9ef84268-d588-465a-a308-a864a43d0070', ttlH: 6,   pages: 15, note: 'Agmarknet daily mandi prices, latest day' },
  aqi:       { rid: '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69', ttlH: 3,   pages: 6,  note: 'CPCB real-time air quality, hourly' },
  petcons:   { rid: '7b624b4a-1456-4945-80d0-dfb5e40ddcff', ttlH: 24,  pages: 1,  note: 'PPAC petroleum product consumption, monthly' },
  pettrade:  { rid: '518e560e-7fa7-4f5b-8aed-3b90323ed965', ttlH: 24,  pages: 4,  note: 'PPAC crude and product imports/exports, monthly' },
  crudeprod: { rid: '7932c3ed-c88d-4e0c-bc39-17e3e3170483', ttlH: 24,  pages: 2,  note: 'PPAC domestic crude oil production, monthly' },
  refprod:   { rid: '8b75d7c2-814b-4eb2-9698-c96d69e5f128', ttlH: 24,  pages: 3,  note: 'PPAC refinery product output, monthly' },
  msme:      { rid: 'f8cd85a1-f9b8-4ff1-b195-9f75c10eb338', ttlH: 72,  pages: 1,  note: 'Udyam MSME registrations by district' },
};
export const PAGE = 1000;
