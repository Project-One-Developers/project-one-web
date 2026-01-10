import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import boundaries from "eslint-plugin-boundaries"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import tailwindCanonical from "eslint-plugin-tailwind-canonical-classes"
import { defineConfig, globalIgnores } from "eslint/config"
import tseslint from "typescript-eslint"
import { noUnsafeZodParse } from "./eslint-rules/no-unsafe-zod-parse.mjs"

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        settings: {
            react: {
                version: "detect",
            },
        },
        plugins: {
            react,
            "react-hooks": reactHooks,
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // React Hooks
            ...reactHooks.configs.recommended.rules,
            "react-hooks/exhaustive-deps": "error",

            // React
            ...react.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",

            // Core ESLint rules
            "no-console": "error",
            curly: "error",
            "default-case": "error",
            "default-case-last": "error",
            eqeqeq: "error",
            "prefer-template": "error",
            "no-eval": "error",
            "no-duplicate-imports": "error",

            // TypeScript rules with custom config
            "@typescript-eslint/switch-exhaustiveness-check": [
                "error",
                {
                    allowDefaultCaseForExhaustiveSwitch: true,
                    considerDefaultExhaustiveForUnions: true,
                    requireDefaultForNonUnion: false,
                },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/prefer-nullish-coalescing": [
                "error",
                { ignorePrimitives: true },
            ],
            "@typescript-eslint/no-unsafe-type-assertion": "error",
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        },
    },
    {
        files: ["**/*.mjs"],
        ...tseslint.configs.disableTypeChecked,
    },
    // Custom rule: prevent unsafe direct .parse() calls on DB results in repositories
    {
        files: ["src/db/repositories/**/*.ts"],
        plugins: {
            custom: {
                rules: {
                    "no-unsafe-zod-parse": noUnsafeZodParse,
                },
            },
        },
        rules: {
            "custom/no-unsafe-zod-parse": "error",
        },
    },
    // Architecture boundary rules - enforce server/client separation
    // Key rule: components and client code cannot import server-only modules (services, db, env)
    {
        plugins: { boundaries },
        settings: {
            "boundaries/elements": [
                // Server-only (the critical boundaries)
                { type: "db", pattern: ["src/db/**"] },
                { type: "env", pattern: ["src/env.ts", "src/auth.ts"] },

                // Entry points (can access everything)
                { type: "actions", pattern: ["src/actions/**"] },
                { type: "api", pattern: ["src/app/api/**"] },
                { type: "pages", pattern: ["src/app/**"], mode: "file" },

                // Server-side utilities (can import db, env)
                { type: "lib-server", pattern: ["src/lib/server/**"] },

                // Universal utilities (client-safe)
                { type: "lib", pattern: ["src/lib/**"] },
                { type: "shared", pattern: ["src/shared/**"] },

                // Client-side
                { type: "components", pattern: ["src/components/**"] },
                { type: "hooks", pattern: ["src/hooks/**"] },
            ],
        },
        rules: {
            "boundaries/element-types": [
                "error",
                {
                    default: "allow",
                    rules: [
                        // CRITICAL: Components cannot import server-only modules
                        {
                            from: "components",
                            disallow: ["db", "lib-server", "env"],
                            message:
                                "Components cannot import server-only code. Use a Server Action instead.",
                        },
                        // CRITICAL: Hooks cannot import server-only modules
                        {
                            from: "hooks",
                            disallow: ["db", "lib-server", "env"],
                            message:
                                "Hooks cannot import server-only code. Use a Server Action instead.",
                        },
                        // Lib (includes queries) cannot import server-only modules
                        {
                            from: "lib",
                            disallow: ["db", "lib-server", "env"],
                            message: "Lib utilities cannot import server-only code.",
                        },
                        // Shared cannot import anything except shared
                        {
                            from: "shared",
                            disallow: [
                                "db",
                                "lib-server",
                                "env",
                                "actions",
                                "api",
                                "pages",
                                "lib",
                                "components",
                                "hooks",
                            ],
                            message: "Shared code should only import from shared/.",
                        },
                    ],
                },
            ],
        },
    },
    // Tailwind canonical class names
    {
        files: ["**/*.tsx"],
        plugins: { "tailwind-canonical-classes": tailwindCanonical },
        rules: {
            "tailwind-canonical-classes/tailwind-canonical-classes": [
                "warn",
                { cssPath: "./src/app/globals.css" },
            ],
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),
])

export default eslintConfig
