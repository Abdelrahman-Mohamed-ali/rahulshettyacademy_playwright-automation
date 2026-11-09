import users from '../test-data/users.json';
import products from '../test-data/products.json';
import messages from '../test-data/messages.json';
import checkout from '../test-data/checkout.json';
import { getCredentials } from './env';

export interface InvalidUser {
  id: string;
  email: string;
  password: string;
  description: string;
}

export interface ProductData {
  name: string;
  category?: string;
  displayName?: string;
}

export interface CheckoutValidData {
  cvv: string;
  nameOnCard: string;
  expiryMonth: string;
  expiryYear: string;
  country: string;
  countrySearchFragment: string;
}

export function getValidUser() {
  const credentials = getCredentials();
  return {
    ...users.valid,
    email: credentials.username,
    password: credentials.password,
  };
}

export function getInvalidUsers(): InvalidUser[] {
  return users.invalid as InvalidUser[];
}

export function getInvalidUserById(id: string): InvalidUser {
  const user = getInvalidUsers().find((entry) => entry.id === id);
  if (!user) {
    throw new Error(`Unknown invalid user id: ${id}`);
  }
  return user;
}

export function getProducts(): ProductData[] {
  return products.items as ProductData[];
}

export function getProductByName(name: string): ProductData | undefined {
  return getProducts().find((p) => p.name.toLowerCase() === name.toLowerCase());
}

export function getKnownProductNames(): string[] {
  return getProducts().map((p) => p.name);
}

export function getMessages() {
  return messages;
}

export function getCheckoutValidData(): CheckoutValidData {
  return checkout.valid as CheckoutValidData;
}

/** Expected country typeahead suggestions for fragment "ind" (live exploration). */
export const COUNTRY_SUGGESTIONS_FOR_IND = [
  'British Indian Ocean Territory',
  'India',
  'Indonesia',
] as const;
