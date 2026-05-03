/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'dev.keytrace.reverseLookup'

export type QueryParams = {
  /** The claim type (e.g. 'github', 'dns', 'npm'). Mirrors dev.keytrace.claim#type; keep in sync when adding a new provider. */
  type:
    | 'github'
    | 'dns'
    | 'activitypub'
    | 'bsky'
    | 'npm'
    | 'tangled'
    | 'pgp'
    | 'twitter'
    | 'linkedin'
    | 'instagram'
    | 'reddit'
    | 'hackernews'
    | 'orcid'
    | 'itchio'
    | 'discord'
    | (string & {})
  /** The subject identifier being looked up. Matched exactly (case-sensitive). */
  subject: string
}
export type InputSchema = undefined

export interface OutputSchema {
  /** Total number of matching claims. */
  total: number
  matches: Match[]
}

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export class UnknownTypeError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src })
  }
}

export function toKnownErr(e: any) {
  if (e instanceof XRPCError) {
    if (e.error === 'UnknownType') return new UnknownTypeError(e)
  }

  return e
}

export interface Match {
  $type?: 'dev.keytrace.reverseLookup#match'
  /** The DID of the ATProto account that made the claim. */
  did: string
  /** The at-uri of the dev.keytrace.claim record backing this match. */
  claim: string
  /** Timestamp the claim was most recently verified (lastVerifiedAt if present, otherwise createdAt). */
  verifiedAt: string
  /** Present (and true) only when the most recent re-verification attempt hit a transient failure (e.g. key-fetch network error). The match is still based on a prior successful verification, but callers who need strong freshness guarantees may wish to re-verify the claim themselves. Absent when the most recent check succeeded. */
  recheckSuggested?: boolean
}

const hashMatch = 'match'

export function isMatch<V>(v: V) {
  return is$typed(v, id, hashMatch)
}

export function validateMatch<V>(v: V) {
  return validate<Match & V>(v, id, hashMatch)
}
