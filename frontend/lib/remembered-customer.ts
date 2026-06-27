import { pickupPointOptions, type PickupPointId } from "shared";

const storageKey = "sarmaExpress.rememberedCustomer.v1";
const pickupPointIds = new Set<string>(pickupPointOptions.map((pickupPoint) => pickupPoint.id));

export type RememberedCustomer = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  pickupPoint?: PickupPointId;
  deliveryAddress?: string;
};

function readStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStorage(value: RememberedCustomer) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // localStorage can be unavailable in private mode or locked-down browsers.
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function readRememberedCustomer(): RememberedCustomer | null {
  const rawValue = readStorage();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const pickupPoint = normalizeString(parsed.pickupPoint);

    return {
      firstName: normalizeString(parsed.firstName),
      lastName: normalizeString(parsed.lastName),
      phone: normalizeString(parsed.phone),
      pickupPoint: pickupPoint && pickupPointIds.has(pickupPoint) ? (pickupPoint as PickupPointId) : undefined,
      deliveryAddress: normalizeString(parsed.deliveryAddress),
    };
  } catch {
    return null;
  }
}

export function writeRememberedCustomer(patch: RememberedCustomer) {
  const current = readRememberedCustomer() ?? {};
  const next: RememberedCustomer = {
    ...current,
    ...patch,
  };

  writeStorage(next);
}

export function clearRememberedCustomer() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // localStorage can be unavailable in private mode or locked-down browsers.
  }
}
