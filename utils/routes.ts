/**
 * Application hash routes under /client.
 * Always include the /client prefix so Playwright baseURL path is not dropped.
 */
export const routes = {
  login: '/client/#/auth/login',
  products: '/client/#/dashboard/dash',
  cart: '/client/#/dashboard/cart',
  orders: '/client/#/dashboard/myorders',
  checkout: '/client/#/dashboard/order',
  thanks: '/client/#/dashboard/thanks',
} as const;
