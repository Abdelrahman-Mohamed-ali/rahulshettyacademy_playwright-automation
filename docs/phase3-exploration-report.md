# Phase 3 — Application Exploration Report

**Application:** https://rahulshettyacademy.com/client/#/auth/login  
**Date:** 2026-11-09  
**Evidence folder:** `evidence/exploration/`

## 1. Authentication

| Behavior | Observed result | Evidence |
|---|---|---|
| Valid login | Navigates to `#/dashboard/dash` | `07-products-after-login.png` |
| Empty email + empty password | `*Email is required`, `*Password is required`; stays on login | `02-login-empty-both.png` |
| Empty email only | `*Email is required`; stays on login | `03-login-empty-email.png` |
| Empty password only | `*Password is required`; stays on login | `04b/04c-login-empty-password-*.png` |
| Invalid email / invalid password / both invalid | Toast: `Incorrect email or password.`; stays on login | `05-login-invalid-credentials.png`, `06-login-invalid-password.png` |

**Locators (verified):** `#userEmail`, `#userPassword`, `#login`, `#toast-container .toast-message`

## 2. Products

| Behavior | Observed result | Evidence |
|---|---|---|
| Product list after login | Visible products include `ADIDAS ORIGINAL`, `ZARA COAT 3`, `iphone 13 pro` | `08-products-list.png` |
| Add to cart | Toast `Product Added To Cart`; cart badge increments | `10-products-after-multi-add.png` |
| Duplicate grids | Desktop/mobile duplicate `.card-body` nodes exist; interact with visible only | — |

## 3. Shopping Cart

| Behavior | Observed result | Evidence |
|---|---|---|
| Empty cart | Text: `No Products in Your Cart !`; Checkout button not available | `09-cart-empty.png` |
| Multi-item cart | Items listed as `li.items` with `h3` product name | `11-cart-multi-items.png` |
| Remove one product | Row-scoped `button.btn-danger` (trash icon) removes only that product | `12-cart-after-remove-one.png` |
| Remove nonexistent | No UI control/error; automation must detect absence and return `not-found` | — |
| Remove from empty cart | No remove controls; automation returns `empty-cart` | `09-cart-empty.png` |

## 4. Checkout

| Behavior | Observed result | Evidence |
|---|---|---|
| Checkout page | URL `#/dashboard/order?...`; Payment Method form visible | `13-checkout-page.png` |
| Expiry dropdowns | Two `<select>` controls inside Expiry Date field (month, year) | — |
| Country typeahead (`ind`) | Suggestions: `British Indian Ocean Territory`, `India`, `Indonesia` | `14-checkout-country-suggestions.png` |
| Select India | Country input populated with India | `15-checkout-country-selected.png` |
| Place Order without country | Remains on checkout URL; **no toast / no visible validation message observed** | `16-checkout-missing-country.png` |
| Valid Place Order | Navigates to thanks page | `17-checkout-filled-valid.png` → `18-order-confirmation.png` |

**Notes:** Card number is prefilled by the app. CVV and Name on Card are editable. Coupon field exists (`Apply Coupon`) but was not deeply validated.

## 5. Order Confirmation

| Behavior | Observed result | Evidence |
|---|---|---|
| Success page | URL `#/dashboard/thanks?prop=...`; component `app-thanksorder` | `18-order-confirmation.png` |
| Confirmation message | `THANKYOU FOR THE ORDER.` | same |
| Order id | Displayed in a label resembling `\| <orderId> \|` | same |
| Extra actions | Link text mentions Orders History Page; CSV download link present | same |

## 6. Risks / Limitations

1. Missing-country checkout shows **no explicit error message** — negative tests must assert “still on checkout / order not placed”.
2. Coupon validation behavior not fully explored.
3. PayPal/SEPA/Invoice payment method tabs exist visually but Credit Card path is the supported automation path.
4. Product name casing for iPhone may differ between products grid and other views; use case-insensitive matching.
5. Responsive duplicate DOM requires `visible: true` filtering.
6. Creating real orders during exploration mutates the shared practice account order history.
