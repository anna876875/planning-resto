import type { Config } from "jest";
import nextJest from "next/jest.js";

// Crée une config Jest préconfigurée pour Next.js (SWC transform, alias @/, etc.)
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.{ts,tsx}", "**/*.{spec,test}.{ts,tsx}"],
};

export default createJestConfig(config);
