/**
 * Zod schemas for entity extraction
 * Strongly enforced schemas for parsing GPT-5-nano responses
 */

import { z } from "zod";

// Span schema for character positions
export const spanSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  surface: z.string(),
});

// Base entity schema with aliases, spans, and canonical name
const baseEntitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  aliases: z.array(z.string()).default([]),
  canonicalName: z.string().optional(),
  spans: z.array(spanSchema).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

// People entity schema
export const peopleEntitySchema = baseEntitySchema.extend({
  name: z.string().min(1, "Person name is required"),
});

// Locations entity schema
export const locationsEntitySchema = baseEntitySchema.extend({
  name: z.string().min(1, "Location name is required"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

// Companies entity schema
export const companiesEntitySchema = baseEntitySchema.extend({
  name: z.string().min(1, "Company name is required"),
});

// Programs entity schema
export const programsEntitySchema = baseEntitySchema.extend({
  name: z.string().min(1, "Program name is required"),
  description: z.string().nullable().optional(),
});

// Relationship schema
export const relationshipSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  predicate: z.string().min(1, "Predicate is required"),
  object: z.string().min(1, "Object is required"),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.string().optional(),
});

// Response schema for entity extraction
export const entityExtractionResponseSchema = z.object({
  people: z.array(peopleEntitySchema).default([]),
  locations: z.array(locationsEntitySchema).default([]),
  companies: z.array(companiesEntitySchema).default([]),
  programs: z.array(programsEntitySchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
});

// Type exports
export type Span = z.infer<typeof spanSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type PeopleEntity = z.infer<typeof peopleEntitySchema>;
export type LocationsEntity = z.infer<typeof locationsEntitySchema>;
export type CompaniesEntity = z.infer<typeof companiesEntitySchema>;
export type ProgramsEntity = z.infer<typeof programsEntitySchema>;
export type EntityExtractionResponse = z.infer<
  typeof entityExtractionResponseSchema
>;
