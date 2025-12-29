import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
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
