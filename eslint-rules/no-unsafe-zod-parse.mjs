/**
 * Custom ESLint rule to prevent unsafe direct .parse() usage in repository files.
 * Flags ALL .parse() calls on Zod schemas unless they match an exemption pattern.
 *
 * Exemptions:
 * - Object literals (manual construction)
 * - JSON.parse results (external/untrusted data)
 * - Enum schemas (validation only)
 * - safeParse calls (error handling)
 *
 * For all other cases, use mapAndParse() for type-safe mapping between DB types and Zod schemas.
 */

export const noUnsafeZodParse = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Prevent unsafe direct .parse() calls on database results. Use mapAndParse() for type safety.",
            category: "Possible Errors",
            recommended: true,
        },
        schema: [],
        messages: {
            noUnsafeZodParse: `Avoid using .parse() directly on database results. Use mapAndParse() instead to ensure type safety.

Example:
  ❌ Bad:
    return permissionSchema.parse(permission)

  ✅ Good:
    return mapAndParse(
      permission,
      (row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      }),
      permissionSchema
    )

The mapper function enforces TypeScript type checking between DB types and model types.
Import: import { mapAndParse } from "@/db/utils"`,
        },
    },
    create(context) {
        // Get TypeScript service for type checking
        const parserServices = context.sourceCode.parserServices
        const checker = parserServices?.program?.getTypeChecker()

        return {
            // Check for .parse() and .parseAsync() method calls
            CallExpression(node) {
                // Must be a member expression (e.g., schema.parse())
                if (node.callee.type !== "MemberExpression") {
                    return
                }

                const methodName = node.callee.property?.name

                // Only check .parse() and .parseAsync()
                if (methodName !== "parse" && methodName !== "parseAsync") {
                    return
                }

                // Skip .safeParse() - it's used for error handling
                if (methodName === "safeParse") {
                    return
                }

                // Check if it's a Zod schema
                let isZodSchema = false

                if (checker && parserServices) {
                    // Use TypeScript type checking for accurate detection
                    try {
                        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
                            node.callee.object
                        )
                        if (tsNode) {
                            const type = checker.getTypeAtLocation(tsNode)
                            const typeString = checker.typeToString(type)

                            // Check if the type is from Zod
                            isZodSchema =
                                // Direct z.Zod* patterns
                                /z\.Zod[A-Z]\w*/g.test(typeString) ||
                                // Zod type patterns
                                /Zod(String|Number|Boolean|Object|Array|Union|Enum|Literal|Optional|Nullable|Default|Schema|Type|Effects|Intersection|Tuple|Record|Map|Set|Function|Promise|Lazy|Brand|Catch|Pipeline|Readonly|Pipe|Transform|Email|UUID|Min|Max|Length|StartsWith|EndsWith|Regex|Trim|ToLowerCase|ToUpperCase)/i.test(
                                    typeString
                                ) ||
                                // Generic Zod patterns
                                typeString.includes("ZodType") ||
                                typeString.includes("ZodSchema")
                        }
                    } catch {
                        // Fallback to heuristic if type checking fails
                        isZodSchema = fallbackZodDetection(node)
                    }

                    // If TypeScript didn't confirm it's a Zod schema, try fallback
                    if (!isZodSchema) {
                        isZodSchema = fallbackZodDetection(node)
                    }
                } else {
                    // Fallback when TypeScript services aren't available
                    isZodSchema = fallbackZodDetection(node)
                }

                if (!isZodSchema) {
                    return
                }

                // Check exemption patterns
                if (isExemptPattern(node)) {
                    return
                }

                // In repository files, flag ALL .parse() calls unless exempted
                // The exemption check already handles safe patterns (object literals, JSON.parse, enums)
                context.report({
                    node: node,
                    messageId: "noUnsafeZodParse",
                })
            },
        }
    },
}

// Fallback detection when TypeScript services aren't available
function fallbackZodDetection(node) {
    const objectName = getObjectName(node.callee.object)

    // Check if variable name suggests it's a Zod schema
    return !!(
        objectName?.endsWith("Schema") ||
        objectName?.match(/Schema$/) ||
        objectName?.match(/^[a-z]+Enum$/) // Also catch enum schemas
    )
}

// Check if the parse call should be exempted
function isExemptPattern(parseCallNode) {
    const arg = parseCallNode.arguments[0]
    if (!arg) {
        return true // No argument, skip
    }

    // 1. Object literal construction (manual reconstruction)
    if (arg.type === "ObjectExpression") {
        return true
    }

    // 2. Function call - only exempt JSON.parse (external/untrusted data)
    if (arg.type === "CallExpression") {
        // JSON.parse results are external/untrusted data, so exempt
        if (
            arg.callee.type === "MemberExpression" &&
            arg.callee.object.name === "JSON" &&
            arg.callee.property.name === "parse"
        ) {
            return true
        }

        // All other function calls are NOT exempt (use mapAndParse instead)
        return false
    }

    // 3. Array literal
    if (arg.type === "ArrayExpression") {
        return true
    }

    // 4. Enum validation pattern (heuristic based on schema name)
    const schemaName = getObjectName(parseCallNode.callee.object)
    if (schemaName?.match(/Enum$/)) {
        return true // Enum schemas are typically for validation
    }

    return false
}

// Helper function to get the object name from a MemberExpression or Identifier
function getObjectName(object) {
    if (!object) {
        return null
    }

    if (object.type === "Identifier") {
        return object.name
    } else if (object.type === "MemberExpression") {
        return getObjectName(object.object)
    } else if (object.type === "CallExpression" && object.callee) {
        return getObjectName(object.callee)
    }
    return null
}
