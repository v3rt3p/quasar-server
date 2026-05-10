/* eslint-disable @typescript-eslint/no-explicit-any */

import proto from './protos/protos'

type ProtobufFieldValue = boolean | null | number | ProtobufFieldValue[] | ProtobufStruct | string

interface ProtobufStruct {
  [key: string]: ProtobufFieldValue
}

interface Types {
  any: any
  boolean: boolean,
  list: ProtobufFieldValue[],
  null: null,
  number: number,
  string: string,
  struct: ProtobufStruct,
}

type TypeString = keyof Types

export function decodeProtobufStruct (value: proto.google.protobuf.IStruct): ProtobufStruct {
  const result: Record<string, any> = {}
  for (const field of (value.fields ?? [])) {
    const parsedValue = decodeProtobufFieldValue(field.value!)
    result[field.key!] = parsedValue
  }
  return result
}

export function encodeProtobufStruct (value: ProtobufStruct): proto.google.protobuf.IStruct {
  const result: proto.google.protobuf.IStruct = {
    fields: []
  }
  for (const [key, fieldValue] of Object.entries(value)) {
    const encodedValue = encodeProtobufFieldValue(fieldValue)
    result.fields!.push({
      key,
      value: encodedValue
    })
  }
  return result
}

export function getValue<TKey extends TypeString> (struct: ProtobufStruct,
  type: TKey, ...path: (number | string)[]): Types[TKey] | undefined {
  let value: ProtobufFieldValue | undefined = struct
  for (const part of path) {
    if (value === undefined) {
      return undefined
    }
    if (typeof value === 'object' && Array.isArray(value) && typeof part === 'number') {
      value = value[part]
    } else if (typeof value === 'object' && !Array.isArray(value) && typeof part === 'string' && value !== null) {
      value = value[part]
    } else {
      return undefined
    }
  }
  if (typeof value === 'string' && type === 'string') {
    return value as Types[TKey]
  }
  if (typeof value === 'number' && type === 'number') {
    return value as Types[TKey]
  }
  if (typeof value === 'boolean' && type === 'boolean') {
    return value as Types[TKey]
  }
  if (value === null && type === 'null') {
    return value as Types[TKey]
  }
  if (Array.isArray(value) && type === 'list') {
    return value as Types[TKey]
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && type === 'struct') {
    return value as Types[TKey]
  }
  if (type === 'any') {
    return value as Types[TKey]
  }
  return undefined
}

function decodeProtobufFieldValue (value: proto.google.protobuf.IValue): ProtobufFieldValue {
  if (value.structValue !== undefined && value.structValue !== null) {
    return decodeProtobufStruct(value.structValue)
  }
  if (value.stringValue !== undefined && value.stringValue !== null) {
    return value.stringValue
  }
  if (value.nullValue !== undefined && value.nullValue !== null) {
    return null
  }
  if (value.boolValue !== undefined && value.boolValue !== null) {
    return value.boolValue
  }
  if (value.listValue !== undefined && value.listValue !== null) {
    return value.listValue.values?.map((item: any) => decodeProtobufFieldValue(item)) ?? []
  }
  if (value.numberValue !== undefined && value.numberValue !== null) {
    return value.numberValue
  }
  throw new Error(`wut? ${JSON.stringify(value)}`)
}

function encodeProtobufFieldValue (value: ProtobufFieldValue): proto.google.protobuf.IValue {
  switch (typeof value) {
    case 'bigint': {
      throw new Error('bigint not supported')
    }
    case 'boolean': {
      return {
        boolValue: value
      }
    }
    case 'number': {
      return {
        numberValue: value
      }
    }
    case 'string': {
      return {
        stringValue: value
      }
    }
    case 'symbol': {
      throw new Error('symbol not supported')
    }
    case 'undefined': {
      throw new Error('undefined not supported')
    }
    case 'object': {
      if (Array.isArray(value)) {
        return {
          listValue: {
            values: value.map(item => encodeProtobufFieldValue(item))
          }
        }
      } else if (value === null) {
        return {
          nullValue: proto.google.protobuf.NullValue.NULL_VALUE
        }
      } else {
        return {
          structValue: encodeProtobufStruct(value)
        }
      }
    }
    case 'function': {
      throw new Error('function not supported')
    }
  }
}
