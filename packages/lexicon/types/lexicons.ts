/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  DevKeytraceClaim: {
    lexicon: 1,
    id: 'dev.keytrace.claim',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description:
          'An identity claim linking this DID to an external account',
        record: {
          type: 'object',
          required: ['type', 'claimUri', 'identity', 'sigs', 'createdAt'],
          properties: {
            type: {
              type: 'string',
              knownValues: [
                'github',
                'dns',
                'activitypub',
                'bsky',
                'npm',
                'tangled',
                'pgp',
                'twitter',
                'linkedin',
                'instagram',
                'reddit',
                'hackernews',
                'orcid',
                'itchio',
                'discord',
              ],
              description: 'The claim type identifier',
            },
            claimUri: {
              type: 'string',
              description:
                'The identity claim URI (e.g., for github: https://gist.github.com/username/id, dns:example.com)',
            },
            identity: {
              type: 'ref',
              ref: 'lex:dev.keytrace.claim#identity',
              description:
                'Structured data about the claimed identity, derived from the claimUri and knowledge inside the verification process. This is not the raw claim data, but a normalized set of fields that can be used for display and more.',
            },
            sigs: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:dev.keytrace.signature#main',
              },
              description:
                'Cryptographic attestation signatures from verification services, for example from @keytrace.dev. These are optional, and so you can pass an empty array. Keytrace will place its attestation signature in the claim here so that the library @keytrace/claims can be used by external developers to not have to implement their own verification logic.',
            },
            comment: {
              type: 'string',
              maxLength: 256,
              description: 'Optional user-provided label for this claim',
            },
            status: {
              type: 'string',
              description:
                "Current verification status of this claim. Absent on legacy records, treated as 'verified'.",
              knownValues: ['verified', 'failed', 'retracted'],
            },
            lastVerifiedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp of the most recent successful re-verification by the system',
            },
            failedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp when the claim last failed re-verification or was retracted',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Datetime when this claim was created (ISO 8601).',
            },
            nonce: {
              type: 'string',
              maxGraphemes: 128,
              description:
                'Random one-time value embedded in the challenge text posted to the external service. Used by verifiers to confirm the proof was created specifically for this claim session. Keytrace itself does not use this, but other services making claims may require it for their verification process.',
            },
            prerelease: {
              type: 'boolean',
              description:
                'Whether this claim was created during the prerelease/alpha period',
            },
            retractedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Datetime when this claim was retracted. Present only if the claim has been retracted (ISO 8601).',
            },
          },
        },
      },
      identity: {
        type: 'object',
        description: 'Generic identity data for the claimed account',
        required: ['subject'],
        properties: {
          subject: {
            type: 'string',
            description: 'Primary identifier (username, domain, handle, etc.)',
          },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            description: 'Avatar/profile image URL',
          },
          profileUrl: {
            type: 'string',
            format: 'uri',
            description: 'Profile page URL',
          },
          displayName: {
            type: 'string',
            description: 'Display name if different from subject',
          },
        },
      },
    },
  },
  DevKeytraceProfile: {
    lexicon: 1,
    id: 'dev.keytrace.profile',
    defs: {
      main: {
        type: 'record',
        key: 'literal:self',
        description:
          "Keytrace profile settings. Singleton record stored in the user's ATProto repo.",
        record: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              maxGraphemes: 128,
              description:
                'Display name override for the keytrace profile. Falls back to Bluesky display name if absent.',
            },
            bio: {
              type: 'string',
              maxGraphemes: 1024,
              description:
                'Bio or description shown on the keytrace profile page.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  DevKeytraceServerPublicKey: {
    lexicon: 1,
    id: 'dev.keytrace.serverPublicKey',
    defs: {
      main: {
        type: 'record',
        key: 'any',
        description:
          "A signing key for claim attestations. It effectively hosts a JWK on a user's ATProto repo.",
        record: {
          type: 'object',
          required: ['publicJwk', 'validFrom', 'validUntil'],
          properties: {
            publicJwk: {
              type: 'string',
              description: 'JWK public key as a JSON string (RFC 7517 format)',
              maxLength: 512,
            },
            validFrom: {
              type: 'string',
              format: 'datetime',
              description: 'Datetime from which this key is valid (ISO 8601).',
            },
            validUntil: {
              type: 'string',
              format: 'datetime',
              description: 'Datetime until which this key is valid (ISO 8601).',
            },
            comment: {
              type: 'string',
              maxGraphemes: 512,
              description: 'Optional comment or description.',
            },
          },
        },
      },
    },
  },
  DevKeytraceSignature: {
    lexicon: 1,
    id: 'dev.keytrace.signature',
    defs: {
      main: {
        type: 'object',
        description: 'A cryptographic signature attesting to a claim',
        required: ['kid', 'src', 'signedAt', 'attestation', 'signedFields'],
        properties: {
          kid: {
            type: 'string',
            description: 'Key identifier (e.g., date in YYYY-MM-DD format).',
          },
          src: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT URI reference to the signing key record published by the verification service (e.g., at://did:plc:serviceaccount/dev.keytrace.serverPublicKey/2024-01-15).',
          },
          signedAt: {
            type: 'string',
            format: 'datetime',
            description: 'Datetime when the signature was created (ISO 8601).',
          },
          attestation: {
            type: 'string',
            description: 'The cryptographic signature (base64-encoded).',
          },
          retractedAt: {
            type: 'string',
            format: 'datetime',
            description:
              'Datetime when this signature was retracted. Present only if the signature has been retracted (ISO 8601).',
          },
          signedFields: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              "Ordered list of field names included in the signed payload (e.g., ['did', 'subject', 'type', 'verifiedAt'])",
          },
          comment: {
            type: 'string',
            maxGraphemes: 512,
            description: 'Optional comment or description.',
          },
        },
      },
    },
  },
  DevKeytraceStatement: {
    lexicon: 1,
    id: 'dev.keytrace.statement',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description:
          "A public statement signed by one of the user's own published public keys (dev.keytrace.userPublicKey).",
        record: {
          type: 'object',
          required: ['content', 'keyRef', 'sig', 'createdAt'],
          properties: {
            content: {
              type: 'string',
              maxLength: 10000,
              maxGraphemes: 10000,
              description: 'The statement text that was signed.',
            },
            subject: {
              type: 'string',
              maxGraphemes: 256,
              description: 'Optional short subject or title for the statement.',
            },
            keyRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT URI of the dev.keytrace.userPublicKey record whose private key produced this signature (e.g., at://did:plc:xxx/dev.keytrace.userPublicKey/3k4...)',
            },
            sig: {
              type: 'string',
              description:
                'Cryptographic signature of the content field, produced by the key referenced in keyRef (PGP cleartext or detached, base64-encoded binary signature).',
            },
            retractedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Datetime when this statement was retracted. Present only if the statement has been retracted (ISO 8601).',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Datetime when this statement was created (ISO 8601).',
            },
          },
        },
      },
    },
  },
  DevKeytraceUserPublicKey: {
    lexicon: 1,
    id: 'dev.keytrace.userPublicKey',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        description: 'A user-published public key.',
        record: {
          type: 'object',
          required: ['keyType', 'publicKeyArmored', 'createdAt'],
          properties: {
            keyType: {
              type: 'string',
              knownValues: ['pgp', 'ssh-ed25519', 'ssh-ecdsa'],
              description: 'Format of the public key.',
            },
            publicKeyArmored: {
              type: 'string',
              maxLength: 16384,
              maxGraphemes: 16384,
              description: 'Full public key in standard text armored format.',
            },
            fingerprint: {
              type: 'string',
              maxGraphemes: 256,
              description: 'Key fingerprint.',
            },
            label: {
              type: 'string',
              maxGraphemes: 128,
              description:
                "Human-readable label for this key (e.g., 'work laptop', 'signing key').",
            },
            comment: {
              type: 'string',
              maxGraphemes: 512,
              description: 'Optional comment or description.',
            },
            expiresAt: {
              type: 'string',
              format: 'datetime',
              description: 'Datetime when this key expires (ISO 8601).',
            },
            retractedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Datetime when this key was retracted. Present only if the key has been retracted (ISO 8601).',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Datetime when this key was created (ISO 8601).',
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  DevKeytraceClaim: 'dev.keytrace.claim',
  DevKeytraceProfile: 'dev.keytrace.profile',
  DevKeytraceServerPublicKey: 'dev.keytrace.serverPublicKey',
  DevKeytraceSignature: 'dev.keytrace.signature',
  DevKeytraceStatement: 'dev.keytrace.statement',
  DevKeytraceUserPublicKey: 'dev.keytrace.userPublicKey',
} as const
