// backend/src/preferences/preferenceModel.js
"use strict";
const { z } = require("zod");

const PreferenceSchema = z
  .object({
    reporting_currency: z.enum(["THB", "USD"]).default("THB"),
    disclosure_level: z.enum(["beginner", "advanced"]).default("beginner"),
    theme: z.enum(["dark", "light", "system"]).default("light"),
    language: z.enum(["th", "en"]).default("th"),
  })
  .strict(); // strict() ensures no unknown keys (like risk overrides) are accepted

function normalizePreference(payload) {
  if (!payload) return null;
  return {
    reporting_currency: payload.reporting_currency || "THB",
    disclosure_level: payload.disclosure_level || "beginner",
    theme: payload.theme || "light",
    language: payload.language || "th",
    onboarding_completed: Boolean(payload.onboarding_completed_at),
    onboarding_completed_at: payload.onboarding_completed_at || null,
  };
}

module.exports = {
  PreferenceSchema,
  normalizePreference,
};
