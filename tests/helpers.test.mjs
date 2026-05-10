import { describe, it } from "node:test";
import assert from "node:assert";
import {
  computeHealthScore,
  healthBadge,
  buildRecommendation,
  daysAgo,
  nowTs,
} from "../dist/helpers.js";

describe("helpers", () => {
  describe("computeHealthScore", () => {
    it("returns 100 for perfect conditions", () => {
      const score = computeHealthScore({
        openIssues: 0,
        blockedIssues: 0,
        inProgressIssues: 0,
        inReviewIssues: 0,
        totalAgents: 1,
        staleAgents: 0,
        loopDetected: false,
        websiteHealthy: true,
      });
      assert.strictEqual(score, 100); // capped at 100 despite website bonus
    });

    it("caps at 0 for terrible conditions", () => {
      const score = computeHealthScore({
        openIssues: 100,
        blockedIssues: 10,
        inProgressIssues: 0,
        inReviewIssues: 0,
        totalAgents: 1,
        staleAgents: 1,
        loopDetected: true,
        websiteHealthy: false,
      });
      assert.strictEqual(score, 0);
    });

    it("penalizes blocked issues", () => {
      const base = computeHealthScore({
        openIssues: 0,
        blockedIssues: 0,
        inProgressIssues: 0,
        inReviewIssues: 0,
        totalAgents: 1,
        staleAgents: 0,
        loopDetected: false,
        websiteHealthy: false,
      });
      const withBlocked = computeHealthScore({
        openIssues: 0,
        blockedIssues: 2,
        inProgressIssues: 0,
        inReviewIssues: 0,
        totalAgents: 1,
        staleAgents: 0,
        loopDetected: false,
        websiteHealthy: false,
      });
      assert.strictEqual(base - withBlocked, 24);
    });
  });

  describe("healthBadge", () => {
    it("returns healthy for >= 70", () => {
      assert.strictEqual(healthBadge(70), "healthy");
      assert.strictEqual(healthBadge(100), "healthy");
    });

    it("returns warning for 40-69", () => {
      assert.strictEqual(healthBadge(40), "warning");
      assert.strictEqual(healthBadge(69), "warning");
    });

    it("returns critical for < 40", () => {
      assert.strictEqual(healthBadge(39), "critical");
      assert.strictEqual(healthBadge(0), "critical");
    });
  });

  describe("buildRecommendation", () => {
    it("recommends loop fix when loop detected", () => {
      const rec = buildRecommendation({
        loopDetected: true,
        blockedIssues: 0,
        staleAgents: 0,
        openIssues: 0,
        healthScore: 50,
        websiteHealthy: true,
      });
      assert.ok(rec.toLowerCase().includes("loop"));
    });

    it("recommends unblock when blocked", () => {
      const rec = buildRecommendation({
        loopDetected: false,
        blockedIssues: 1,
        staleAgents: 0,
        openIssues: 0,
        healthScore: 50,
        websiteHealthy: true,
      });
      assert.ok(rec.toLowerCase().includes("unblock"));
    });
  });

  describe("daysAgo", () => {
    it("returns 0 for null", () => {
      assert.strictEqual(daysAgo(null), 0);
    });

    it("returns correct days for past date", () => {
      const past = new Date(nowTs() - 3 * 86400000);
      assert.strictEqual(daysAgo(past), 3);
    });
  });
});
