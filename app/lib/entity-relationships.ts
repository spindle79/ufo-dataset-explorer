/**
 * Entity Relationship Utilities
 * Handles creating relationships between entities and source items
 */

import { createAdminClient } from "@/lib/supabase/server";

export type SourceType = "pdf" | "audio" | "video" | "scrape";

/**
 * Create a relationship between a person and a source item
 */
export async function createPersonRelationship(
  personId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("people_relationships")
    .insert({
      person_id: personId,
      source_type: sourceType,
      source_id: sourceId,
    });

  if (error) {
    // If it's a unique constraint violation, that's fine - relationship already exists
    if (error.code === "23505") {
      return;
    }
    throw error;
  }
}

/**
 * Create a relationship between a location and a source item
 */
export async function createLocationRelationship(
  locationId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("locations_relationships")
    .insert({
      location_id: locationId,
      source_type: sourceType,
      source_id: sourceId,
    });

  if (error) {
    if (error.code === "23505") {
      return;
    }
    throw error;
  }
}

/**
 * Create a relationship between a company and a source item
 */
export async function createCompanyRelationship(
  companyId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("companies_relationships")
    .insert({
      company_id: companyId,
      source_type: sourceType,
      source_id: sourceId,
    });

  if (error) {
    if (error.code === "23505") {
      return;
    }
    throw error;
  }
}

/**
 * Create a relationship between a program and a source item
 */
export async function createProgramRelationship(
  programId: string,
  sourceType: SourceType,
  sourceId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("programs_relationships")
    .insert({
      program_id: programId,
      source_type: sourceType,
      source_id: sourceId,
    });

  if (error) {
    if (error.code === "23505") {
      return;
    }
    throw error;
  }
}

/**
 * Get or create a person entity (upsert by name)
 * Returns the person ID
 */
export async function getOrCreatePerson(
  name: string,
  aliases: string[] = []
): Promise<string> {
  const supabase = createAdminClient();

  // Try to find existing person by name
  const { data: existing } = await supabase
    .from("people")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    // Update aliases if needed (merge with existing)
    if (aliases.length > 0) {
      const { data: current } = await supabase
        .from("people")
        .select("aliases")
        .eq("id", existing.id)
        .single();

      if (current) {
        const currentAliases = current.aliases || [];
        const mergedAliases = [
          ...new Set([...currentAliases, ...aliases]),
        ].filter((a) => a !== name); // Remove name from aliases

        await supabase
          .from("people")
          .update({ aliases: mergedAliases })
          .eq("id", existing.id);
      }
    }
    return existing.id;
  }

  // Create new person
  const { data: newPerson, error } = await supabase
    .from("people")
    .insert({
      name,
      aliases: aliases.filter((a) => a !== name),
    })
    .select("id")
    .single();

  if (error || !newPerson) {
    throw new Error(`Failed to create person: ${error?.message || "Unknown error"}`);
  }

  return newPerson.id;
}

/**
 * Get or create a location entity (upsert by name)
 */
export async function getOrCreateLocation(
  name: string,
  aliases: string[] = [],
  additionalData?: {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }
): Promise<string> {
  const supabase = createAdminClient();

  // Try to find existing location by name
  const { data: existing } = await supabase
    .from("locations")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    // Update aliases and additional data if needed
    const updates: any = {};
    if (aliases.length > 0) {
      const { data: current } = await supabase
        .from("locations")
        .select("aliases")
        .eq("id", existing.id)
        .single();
      if (current) {
        const currentAliases = current.aliases || [];
        updates.aliases = [
          ...new Set([...currentAliases, ...aliases]),
        ].filter((a) => a !== name);
      }
    }
    if (additionalData) {
      Object.assign(updates, additionalData);
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("locations").update(updates).eq("id", existing.id);
    }
    return existing.id;
  }

  // Create new location
  const { data: newLocation, error } = await supabase
    .from("locations")
    .insert({
      name,
      aliases: aliases.filter((a) => a !== name),
      ...additionalData,
    })
    .select("id")
    .single();

  if (error || !newLocation) {
    throw new Error(`Failed to create location: ${error?.message || "Unknown error"}`);
  }

  return newLocation.id;
}

/**
 * Get or create a company entity (upsert by name)
 */
export async function getOrCreateCompany(
  name: string,
  aliases: string[] = []
): Promise<string> {
  const supabase = createAdminClient();

  // Try to find existing company by name
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    // Update aliases if needed
    if (aliases.length > 0) {
      const { data: current } = await supabase
        .from("companies")
        .select("aliases")
        .eq("id", existing.id)
        .single();
      if (current) {
        const currentAliases = current.aliases || [];
        const mergedAliases = [
          ...new Set([...currentAliases, ...aliases]),
        ].filter((a) => a !== name);

        await supabase
          .from("companies")
          .update({ aliases: mergedAliases })
          .eq("id", existing.id);
      }
    }
    return existing.id;
  }

  // Create new company
  const { data: newCompany, error } = await supabase
    .from("companies")
    .insert({
      name,
      aliases: aliases.filter((a) => a !== name),
    })
    .select("id")
    .single();

  if (error || !newCompany) {
    throw new Error(`Failed to create company: ${error?.message || "Unknown error"}`);
  }

  return newCompany.id;
}

/**
 * Get or create a program entity (upsert by name)
 */
export async function getOrCreateProgram(
  name: string,
  aliases: string[] = [],
  description?: string | null
): Promise<string> {
  const supabase = createAdminClient();

  // Try to find existing program by name
  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    // Update aliases and description if needed
    const updates: any = {};
    if (aliases.length > 0) {
      const { data: current } = await supabase
        .from("programs")
        .select("aliases")
        .eq("id", existing.id)
        .single();
      if (current) {
        const currentAliases = current.aliases || [];
        updates.aliases = [
          ...new Set([...currentAliases, ...aliases]),
        ].filter((a) => a !== name);
      }
    }
    if (description) {
      updates.description = description;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("programs").update(updates).eq("id", existing.id);
    }
    return existing.id;
  }

  // Create new program
  const { data: newProgram, error } = await supabase
    .from("programs")
    .insert({
      name,
      aliases: aliases.filter((a) => a !== name),
      description: description || null,
    })
    .select("id")
    .single();

  if (error || !newProgram) {
    throw new Error(`Failed to create program: ${error?.message || "Unknown error"}`);
  }

  return newProgram.id;
}

