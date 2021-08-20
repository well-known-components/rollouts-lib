import * as murmurHash3 from "murmurhash3js"
import { compare, valid } from "semver"

/**
 * @public
 */
export type RolloutName = string

/**
 * @public
 */
export type RolloutVersion = string

/**
 * @public
 */
export type RolloutDomain = {
  records: Record<RolloutName, RolloutRecord[]>
}

/**
 * @public
 */
export type RolloutRecord = {
  version: string
  percentage: number
  prefix: string

  updatedAt?: number
  createdAt?: number
}

/**
 * User context used to calculate rollouts.
 * @public
 */
export type Context = {
  userId?: string
  sessionId?: string
  remoteAddress?: string
}

/**
 * This function calculates a normalized value for a RolloutRecord and a Context.
 * The function is stable and deterministic for non-empty contexts,
 * it returns a numeric hash from 1 to 100.
 * @public
 */
export function normalizedValue(context: Context, rollout: RolloutRecord): number {
  const userId = context.userId || context.sessionId || context.remoteAddress || Math.random()
  const rolloutId = `${rollout.version}:${rollout.prefix}`
  return (murmurHash3.x86.hash32(`${rolloutId}:${userId}`) % 100) + 1
}

/**
 * Calculates and selects a rollout for a list of RolloutRecords and a given
 * Context.
 *
 * @public
 */
export function calculateRollout(context: Context, records: RolloutRecord[]): RolloutRecord {
  if (records.length == 0) {
    throw new Error("Empty rollouts")
  }
  for (let rollout of records) {
    const normalizedUserId = normalizedValue(context, rollout)
    if (rollout.percentage > 0 && normalizedUserId <= rollout.percentage) {
      return rollout
    }
  }
  // return last as fallback
  return records[records.length - 1]
}

/**
 * Calculates all rollouts for a specific RolloutDomain and Context
 *
 * @public
 */
export function calculateRolloutsForDomain(
  context: Context,
  domain: Partial<RolloutDomain>
): Record<string, RolloutRecord> {
  const map: Record<string, RolloutRecord> = {}

  if (domain.records) {
    for (let rolloutName of Object.keys(domain.records)) {
      if (domain.records[rolloutName] && domain.records[rolloutName].length) {
        map[rolloutName] = calculateRollout(context, domain.records[rolloutName])
      }
    }
  }

  return map
}

/**
 * @public
 */
export function patchRollouts(
  currentValues: Partial<RolloutDomain>,
  rolloutName: string,
  patch: Pick<RolloutRecord, "percentage" | "prefix" | "version">,
  timestamp: number = Date.now()
): Partial<RolloutDomain> {
  const { version, percentage, prefix } = patch

  if (typeof rolloutName != "string" || !rolloutName.length) {
    throw new Error("patchRollouts: invalid rolloutName")
  }
  if (typeof version != "string" || !version.length || !valid(version)) {
    throw new Error("patchRollouts: invalid version: " + version)
  }
  if (typeof percentage != "number" || isNaN(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(`patchRollouts: invalid percentage ${percentage}`)
  }
  if (typeof timestamp != "number" || isNaN(timestamp) || timestamp <= 0) {
    throw new Error(`patchRollouts: invalid timestamp ${timestamp}`)
  }

  // always normalize for backwards compatibility
  currentValues.records = currentValues.records || {}
  currentValues.records[rolloutName] = currentValues.records[rolloutName] || []

  // apply changes
  let currentVersion = currentValues.records[rolloutName]!.find(($) => $.version == version)

  if (!currentVersion) {
    currentVersion = {
      percentage: percentage | 0,
      prefix,
      version,
      createdAt: timestamp,
    }
    currentValues.records[rolloutName]!.push(currentVersion)
  }

  // override currentVersion percentage
  currentVersion.percentage = percentage
  currentVersion.updatedAt = timestamp

  // sort deployments before saving
  currentValues.records[rolloutName]!.sort((a, b) => {
    return -compare(a.version, b.version)
  })

  return currentValues
}
