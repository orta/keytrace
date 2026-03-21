/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'dev.keytrace.serverPublicKey'

export interface Main {
  $type: 'dev.keytrace.serverPublicKey'
  /** JWK public key as a JSON string (RFC 7517 format) */
  publicJwk: string
  /** Datetime from which this key is valid (ISO 8601). */
  validFrom: string
  /** Datetime until which this key is valid (ISO 8601). */
  validUntil: string
  /** Optional comment or description. */
  comment?: string
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
