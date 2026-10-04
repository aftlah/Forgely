import { z } from "zod";

/** Discord IDs ("snowflakes") are 17-20 digit strings. Never store or compare them as numbers. */
export const SNOWFLAKE_PATTERN = /^\d{17,20}$/;

export const snowflakeSchema = z.string().regex(SNOWFLAKE_PATTERN);
