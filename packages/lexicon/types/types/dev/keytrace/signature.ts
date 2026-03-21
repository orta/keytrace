/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'dev.keytrace.signature'

/** A cryptographic signature attesting to a claim */
export interface Main {
  $type?: 'dev.keytrace.signature'
  /** Key identifier (e.g., date in YYYY-MM-DD format). */
  kid: string
  /** AT URI reference to the signing key record published by the verification service (e.g., at://did:plc:serviceaccount/dev.keytrace.serverPublicKey/2024-01-15). */
  src: string
  /** Datetime when the signature was created (ISO 8601). */
  signedAt: string
  /** The cryptographic signature (base64-encoded). */
  attestation: string
  /** Datetime when this signature was retracted. Present only if the signature has been retracted (ISO 8601). */
  retractedAt?: string
  /** Ordered list of field names included in the signed payload (e.g., ['did', 'subject', 'type', 'verifiedAt']) */
  signedFields: string[]
  /** Optional comment or description. */
  comment?: string
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
