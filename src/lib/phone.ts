import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode
} from "libphonenumber-js";

export type PhoneCountryOption = {
  iso2: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
  label: string;
};

const PRIORITY_COUNTRIES: CountryCode[] = [
  "EG",
  "SA",
  "AE",
  "KW",
  "QA",
  "BH",
  "OM",
  "US",
  "GB"
];

export const DEFAULT_PHONE_COUNTRY: CountryCode = "EG";

function getCountryName(code: CountryCode) {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryCodeToFlag(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function isSupportedPhoneCountry(value: string): value is CountryCode {
  return isSupportedCountry(value);
}

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = getCountries()
  .map((country) => {
    const dialCode = `+${getCountryCallingCode(country)}`;
    const name = getCountryName(country);
    const flag = countryCodeToFlag(country);

    return {
      iso2: country,
      name,
      dialCode,
      flag,
      label: `${flag} ${name} (${dialCode})`
    };
  })
  .sort((a, b) => {
    const priorityA = PRIORITY_COUNTRIES.indexOf(a.iso2);
    const priorityB = PRIORITY_COUNTRIES.indexOf(b.iso2);

    if (priorityA !== -1 || priorityB !== -1) {
      if (priorityA === -1) return 1;
      if (priorityB === -1) return -1;
      return priorityA - priorityB;
    }

    return a.name.localeCompare(b.name, "en");
  });

export function getPhoneCountryOption(country: string | null | undefined) {
  if (!country || !isSupportedPhoneCountry(country)) {
    return PHONE_COUNTRY_OPTIONS.find((option) => option.iso2 === DEFAULT_PHONE_COUNTRY) ?? PHONE_COUNTRY_OPTIONS[0];
  }

  return PHONE_COUNTRY_OPTIONS.find((option) => option.iso2 === country) ?? PHONE_COUNTRY_OPTIONS[0];
}

export function normalizePhoneDetails(country: string, phoneNumber: string) {
  if (!isSupportedPhoneCountry(country)) {
    return null;
  }

  const sanitized = phoneNumber.trim();
  if (!sanitized) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(sanitized, country);
  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return {
    phoneCountry: country,
    phoneNumber: parsed.nationalNumber,
    phoneE164: parsed.number
  };
}
