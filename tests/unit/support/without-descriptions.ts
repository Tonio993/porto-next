/** Compare the original authoritative values independently from additive read projections.
 * PR07 projection correctness is covered by descriptive-references and descriptive-callers.
 */
export function withoutDescriptions<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutDescriptions) as T
  if (!value || typeof value !== 'object') return value
  const object = value as Record<string, unknown>
  const projection = new Set([
    'references',
    'beforeReference',
    'afterReference',
    'versionReference',
    'vesselReference',
  ])
  if ('openingOperationId' in object) projection.add('reference')
  if ('source' in object && 'businessName' in object && 'versionId' in object)
    projection.add('description')
  return Object.fromEntries(
    Object.entries(object)
      .filter(([key]) => !projection.has(key))
      .map(([key, v]) => [key, withoutDescriptions(v)]),
  ) as T
}
