/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'dev.keytrace.userPublicKey'

export interface Main {
  $type: 'dev.keytrace.userPublicKey'
  /** Format of the public key. */
  keyType: 'pgp' | 'ssh-ed25519' | 'ssh-ecdsa' | (string & {})
  /** Full public key in standard text armored format. */
  publicKeyArmored: string
  /** Key fingerprint. */
  fingerprint?: string
  /** Human-readable label for this key (e.g., 'work laptop', 'signing key'). */
  label?: string
  /** Optional comment or description. */
  comment?: string
  /** Datetime when this key expires (ISO 8601). */
  expiresAt?: string
  /** Datetime when this key was retracted. Present only if the key has been retracted (ISO 8601). */
  retractedAt?: string
  /** Datetime when this key was created (ISO 8601). */
  createdAt: string
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
