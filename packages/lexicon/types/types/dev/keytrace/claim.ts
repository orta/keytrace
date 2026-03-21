/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as DevKeytraceSignature from './signature.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'dev.keytrace.claim'

export interface Main {
  $type: 'dev.keytrace.claim'
  /** The claim type identifier */
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
    | (string & {})
  /** The identity claim URI (e.g., for github: https://gist.github.com/username/id, dns:example.com) */
  claimUri: string
  identity: Identity
  /** Cryptographic attestation signatures from verification services, for example from @keytrace.dev. These are optional, and so you can pass an empty array. Keytrace will place its attestation signature in the claim here so that the library @keytrace/claims can be used by external developers to not have to implement their own verification logic. */
  sigs: DevKeytraceSignature.Main[]
  /** Optional user-provided label for this claim */
  comment?: string
  /** Current verification status of this claim. Absent on legacy records, treated as 'verified'. */
  status?: 'verified' | 'failed' | 'retracted' | (string & {})
  /** Timestamp of the most recent successful re-verification by the system */
  lastVerifiedAt?: string
  /** Timestamp when the claim last failed re-verification or was retracted */
  failedAt?: string
  /** Datetime when this claim was created (ISO 8601). */
  createdAt: string
  /** Random one-time value embedded in the challenge text posted to the external service. Used by verifiers to confirm the proof was created specifically for this claim session. Keytrace itself does not use this, but other services making claims may require it for their verification process. */
  nonce?: string
  /** Whether this claim was created during the prerelease/alpha period */
  prerelease?: boolean
  /** Datetime when this claim was retracted. Present only if the claim has been retracted (ISO 8601). */
  retractedAt?: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}

/** Generic identity data for the claimed account */
export interface Identity {
  $type?: 'dev.keytrace.claim#identity'
  /** Primary identifier (username, domain, handle, etc.) */
  subject: string
  /** Avatar/profile image URL */
  avatarUrl?: string
  /** Profile page URL */
  profileUrl?: string
  /** Display name if different from subject */
  displayName?: string
}

const hashIdentity = 'identity'

export function isIdentity<V>(v: V) {
  return is$typed(v, id, hashIdentity)
}

export function validateIdentity<V>(v: V) {
  return validate<Identity & V>(v, id, hashIdentity)
}
