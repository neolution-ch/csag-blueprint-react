import { Skeleton, Stack } from '@mantine/core'
import { z } from 'zod'

type FormSkeletonProps = {
    /** Number of skeleton fields to display, or a Zod object schema to auto-count fields. */
    fields: number | z.ZodObject<z.ZodRawShape>
    /** Gap between skeleton fields. Defaults to Mantine's Stack default. */
    gap?: string | number
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
        return unwrap(schema.unwrap() as z.ZodTypeAny)
    }
    if (schema instanceof z.ZodDefault) {
        return unwrap(schema.removeDefault() as z.ZodTypeAny)
    }
    return schema
}

function isCheckboxLike(field: z.ZodTypeAny): boolean {
    return unwrap(field) instanceof z.ZodBoolean
}

/**
 * Renders a loading skeleton that mimics the visual layout of a form.
 *
 * Accepts either a plain field count or a Zod object schema — when a schema is
 * passed, the skeleton count and shapes are derived automatically (booleans
 * render as short checkbox-sized skeletons, everything else as full-width inputs).
 */
export function FormSkeleton({ fields, gap }: FormSkeletonProps) {
    const items =
        typeof fields === 'number'
            ? Array.from({ length: fields }, () => false)
            : Object.values(fields.shape as Record<string, z.ZodTypeAny>).map(
                  isCheckboxLike,
              )

    return (
        <Stack gap={gap}>
            {items.map((checkbox, i) => (
                <Stack key={i} gap={4}>
                    {/* Label */}
                    <Skeleton height={14} width={checkbox ? 120 : 80} />
                    {/* Input — boolean fields get a smaller checkbox-sized skeleton */}
                    {checkbox ? (
                        <Skeleton height={20} width={20} radius="sm" />
                    ) : (
                        <Skeleton height={36} radius="sm" />
                    )}
                </Stack>
            ))}
        </Stack>
    )
}
