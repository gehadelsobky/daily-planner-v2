import { describe, expect, it } from "vitest";
import { DEFAULT_PHONE_COUNTRY, getPhoneCountryOption, normalizePhoneDetails } from "../src/lib/phone";

describe("phone helpers", () => {
  it("normalizes valid numbers to E.164", () => {
    const parsed = normalizePhoneDetails("EG", "01012345678");

    expect(parsed).toEqual({
      phoneCountry: "EG",
      phoneNumber: "1012345678",
      phoneE164: "+201012345678"
    });
  });

  it("rejects invalid phone numbers", () => {
    expect(normalizePhoneDetails("EG", "123")).toBeNull();
  });

  it("returns default country option when input is empty", () => {
    expect(getPhoneCountryOption(undefined).iso2).toBe(DEFAULT_PHONE_COUNTRY);
  });
});
