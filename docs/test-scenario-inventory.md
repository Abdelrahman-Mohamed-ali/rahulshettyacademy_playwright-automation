# Phase 3 — Test Scenario Inventory

Tags used: `@smoke` `@regression` `@sanity` `@positive` `@negative`  
Modes: `headed` | `headless` | `debug`  
Priority: P0 (critical) · P1 (high) · P2 (medium)

> Scenarios below are a **design inventory only**. Full business specs are implemented in later phases.

---

## A. Authentication

### AUTH-01 — Valid login with registered credentials
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@smoke @regression @positive` |
| **Mode** | headless (CI), headed (local demo) |
| **Priority** | P0 |
| **Preconditions** | Valid `TEST_USERNAME` / `TEST_PASSWORD` available via env |
| **Steps** | 1. Open login page 2. Enter valid email/password 3. Click Login |
| **Expected** | Navigate to `#/dashboard/dash`; products visible; user can access cart/orders |

### AUTH-02 — Invalid email and invalid password
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless / debug |
| **Priority** | P0 |
| **Preconditions** | On login page |
| **Steps** | 1. Enter unregistered email 2. Enter wrong password 3. Submit |
| **Expected** | Toast `Incorrect email or password.`; remain on `#/auth/login`; no dashboard access |

### AUTH-03 — Valid email with invalid password
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | Known valid username from env |
| **Steps** | 1. Enter valid email 2. Enter wrong password 3. Submit |
| **Expected** | Toast `Incorrect email or password.`; remain on login |

### AUTH-04 — Invalid email with password-shaped value
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | On login page |
| **Steps** | 1. Enter unregistered email 2. Enter any password 3. Submit |
| **Expected** | Toast `Incorrect email or password.`; remain on login |

### AUTH-05 — Empty email and empty password
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@smoke @regression @negative` |
| **Mode** | headless / debug |
| **Priority** | P0 |
| **Preconditions** | On login page with blank fields |
| **Steps** | 1. Leave both fields empty 2. Click Login |
| **Expected** | `*Email is required` and `*Password is required`; remain on login |

### AUTH-06 — Empty email only
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | On login page |
| **Steps** | 1. Leave email empty 2. Enter a password 3. Submit |
| **Expected** | `*Email is required`; remain on login |

### AUTH-07 — Empty password only
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless / debug |
| **Priority** | P1 |
| **Preconditions** | On login page |
| **Steps** | 1. Enter an email 2. Leave password empty 3. Submit |
| **Expected** | `*Password is required`; remain on login |

---

## B. Products

### PRD-01 — View available products after login
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@smoke @sanity @positive` |
| **Mode** | headless |
| **Priority** | P0 |
| **Preconditions** | Authenticated user |
| **Steps** | 1. Login 2. Observe dashboard product grid |
| **Expected** | At least one visible product card; known catalog includes ADIDAS ORIGINAL, ZARA COAT 3, iphone 13 pro |

### PRD-02 — Add a single product to cart
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@smoke @regression @positive` |
| **Mode** | headless / headed |
| **Priority** | P0 |
| **Preconditions** | Authenticated; cart preferably cleared |
| **Steps** | 1. Locate product by name 2. Click Add To Cart |
| **Expected** | Toast `Product Added To Cart`; cart badge increments; product appears in cart |

### PRD-03 — Add multiple products to cart
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@regression @positive` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | Authenticated; empty cart |
| **Steps** | 1. Add product A 2. Add product B 3. Add product C 4. Open cart |
| **Expected** | All selected products listed in cart; badge reflects count |

### PRD-04 — Product selection by dynamic name
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@regression @positive` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | Authenticated |
| **Steps** | 1. Resolve product card by name (case-insensitive) 2. Interact only with that card |
| **Expected** | Correct visible card targeted; no strict-mode / hidden duplicate issues |

---

## C. Cart

### CART-01 — Open cart and verify selected products
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@smoke @regression @positive` |
| **Mode** | headless |
| **Priority** | P0 |
| **Preconditions** | One or more products already added |
| **Steps** | 1. Navigate to cart 2. Read product names / prices |
| **Expected** | Expected products present with price/stock info |

### CART-02 — Remove one product from a multi-item cart (dynamic RemoveItem)
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@smoke @regression @positive` |
| **Mode** | headless / headed |
| **Priority** | P0 |
| **Preconditions** | Cart contains ≥ 2 products |
| **Steps** | 1. Call `removeItem(targetName)` 2. Verify remaining products |
| **Expected** | Target removed; other products remain |

### CART-03 — Remove first / middle / last product positions
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@regression @positive` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | Cart contains 3 products |
| **Steps** | Remove by name for first, then middle-origin, then last (parameterized) |
| **Expected** | Each targeted product removed without affecting others incorrectly |

### CART-04 — Remove all products via repeated dynamic RemoveItem
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@regression @positive` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | Cart contains multiple products |
| **Steps** | Repeatedly remove by current first/known names until empty |
| **Expected** | Cart shows `No Products in Your Cart !` |

### CART-05 — Attempt to remove a nonexistent product
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless / debug |
| **Priority** | P1 |
| **Preconditions** | Cart has known products (or empty) |
| **Steps** | 1. Call `removeItem('NOT_A_REAL_PRODUCT')` |
| **Expected** | Result status `not-found`; cart contents unchanged |

### CART-06 — Attempt to remove from an empty cart
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless / debug |
| **Priority** | P1 |
| **Preconditions** | Empty cart (`No Products in Your Cart !`) |
| **Steps** | 1. Call `removeItem(anyName)` |
| **Expected** | Result status `empty-cart`; empty message still visible |

### CART-07 — Verify quantities / cart totals for selected items
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@regression @positive` |
| **Mode** | headless |
| **Priority** | P2 |
| **Preconditions** | Known products in cart |
| **Steps** | 1. Open cart 2. Read line price / subtotal labels |
| **Expected** | Displayed amounts match selected products (as shown by UI) |

---

## D. Checkout

### CHK-01 — Proceed to checkout with valid cart data
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@smoke @regression @positive` |
| **Mode** | headless |
| **Priority** | P0 |
| **Preconditions** | Cart has ≥ 1 product |
| **Steps** | 1. Open cart 2. Click Checkout |
| **Expected** | Navigate to `#/dashboard/order`; Payment Method visible |

### CHK-02 — Complete valid checkout and place order
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@smoke @regression @positive` |
| **Mode** | headless / headed |
| **Priority** | P0 |
| **Preconditions** | On checkout with cart items |
| **Steps** | 1. Fill CVV + Name on Card 2. Select expiry 3. Choose country `India` via typeahead 4. Place Order |
| **Expected** | Navigate to `#/dashboard/thanks`; message `THANKYOU FOR THE ORDER.`; order id visible |

### CHK-03 — Checkout missing country (required shipping country)
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | headless / debug |
| **Priority** | P1 |
| **Preconditions** | On checkout; country cleared/empty |
| **Steps** | 1. Fill CVV/Name optionally 2. Leave country empty 3. Click Place Order |
| **Expected** | Remain on checkout/order page; order **not** placed (no thanks page). **No explicit toast/error observed in exploration.** |

### CHK-04 — Country typeahead selects exact match only
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@regression @positive` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | On checkout |
| **Steps** | 1. Type `ind` 2. Verify suggestions include India / Indonesia / British Indian Ocean Territory 3. Select exact `India` |
| **Expected** | India selected; order can proceed |

### CHK-05 — Checkout with missing CVV / Name on Card (probe supported validation)
| Field | Value |
|---|---|
| **Type** | Negative |
| **Tags** | `@regression @negative` |
| **Mode** | debug / headless |
| **Priority** | P2 |
| **Preconditions** | On checkout |
| **Steps** | 1. Leave CVV and/or Name empty 2. Select country 3. Place Order |
| **Expected** | **Only assert what the app actually does** after Phase 5 probe; do not invent messages. If app still places order, document as product limitation rather than force a failing assertion. |

### CHK-06 — Verify order confirmation details after successful placement
| Field | Value |
|---|---|
| **Type** | Positive |
| **Tags** | `@regression @sanity @positive` |
| **Mode** | headless |
| **Priority** | P1 |
| **Preconditions** | Order just placed |
| **Steps** | 1. Land on thanks page 2. Read thank-you text / order id / product summary |
| **Expected** | `THANKYOU FOR THE ORDER.`; order id label present; ordered product referenced |

---

## Suggested implementation mapping (later phases)

| Area | Spec file (planned) | Primary Page Objects |
|---|---|---|
| Auth | `tests/auth/login.spec.ts` | `LoginPage` |
| Products / Cart | `tests/cart/cart.spec.ts` | `ProductsPage`, `CartPage` |
| Checkout | `tests/checkout/checkout.spec.ts` | `CartPage`, `CheckoutPage`, `OrderConfirmationPage` |

## Tag × Mode examples (Phase 4+)

```bash
npm run test:smoke
npm run test:negative
npm run test:smoke:headed
npx playwright test --grep "@smoke.*@positive"
npx playwright test --grep @negative --debug
```
