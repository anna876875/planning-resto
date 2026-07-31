import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Règles Next.js (accessibilité, performances) + TypeScript + désactivation
  // des règles ESLint qui entreraient en conflit avec Prettier
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),

  {
    rules: {
      // Pas de console.log en production ; warn/error autorisés
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Préférer const quand la variable n'est pas réassignée
      "prefer-const": "error",

      // Variables déclarées mais non utilisées : erreur, sauf si le nom commence par _
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // any implicite : avertissement (interdit au strict mais parfois nécessaire en migration)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
