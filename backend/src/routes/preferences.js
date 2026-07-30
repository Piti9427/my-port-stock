// backend/src/routes/preferences.js
"use strict";
const express = require("express");
const { z } = require("zod");
const { getRequestUserId } = require("../auth/requestAuth");
const supabaseClient = require("../db/supabaseClient");
const {
  PreferenceSchema,
  normalizePreference,
} = require("../preferences/preferenceModel");
const preferenceRepository = require("../preferences/preferenceRepository");

const router = express.Router();

function getUserId(req) {
  return getRequestUserId(req);
}

function runtimeInsufficientData(reason) {
  return {
    status: "INSUFFICIENT_DATA",
    error_details: reason,
  };
}

router.get("/", async (req, res, next) => {
  if (!supabaseClient.supabaseConfigured) {
    return res
      .status(503)
      .json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const preferences = await preferenceRepository.getForUser(userId);
    if (!preferences) {
      // Return defaults if no row exists yet, but onboarding_completed is false
      return res.status(200).json({
        reporting_currency: "THB",
        disclosure_level: "beginner",
        theme: "light",
        language: "th",
        onboarding_completed: false,
        onboarding_completed_at: null,
      });
    }
    res.status(200).json(normalizePreference(preferences));
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  if (!supabaseClient.supabaseConfigured) {
    return res
      .status(503)
      .json(runtimeInsufficientData("Supabase is not configured"));
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const validated = PreferenceSchema.parse(req.body);
    const result = await preferenceRepository.upsertForUser(userId, validated);
    res.status(200).json(normalizePreference(result));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: err.issues.map((e) => e.message).join(", ") });
    }
    next(err);
  }
});

module.exports = router;
