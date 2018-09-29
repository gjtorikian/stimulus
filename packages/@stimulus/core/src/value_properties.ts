import { Constructor } from "./constructor"
import { Controller } from "./controller"
import { readInheritableStaticArray } from "./inheritable_static_array"
import { capitalize } from "./string_helpers"

/** @hidden */
export function ValuePropertiesBlessing<T>(constructor: Constructor<T>) {
  const values = readInheritableStaticArray(constructor, "values")
  return values.reduce((properties, valueDefinition) => {
    return Object.assign(properties, propertiesForValueDefinition(valueDefinition))
  }, {} as PropertyDescriptorMap)
}

function propertiesForValueDefinition<T>(valueDefinition: ValueDefinition): PropertyDescriptorMap {
  const key = typeof valueDefinition == "string" ? valueDefinition : valueDefinition.name
  const type = typeof valueDefinition == "string" ? "string" : valueDefinition.type || "string"
  const defaultValue = typeof valueDefinition == "string" ? undefined : valueDefinition.default
  const read = readers[type]

  return {
    [key]: {
      get: defaultValue == undefined
        ? getOrThrow(key, read)
        : getWithDefault(key, read, defaultValue),

      set(this: Controller, value: T | undefined) {
        if (value == undefined) {
          this.data.delete(key)
        } else {
          this.data.set(key, `${value}`)
        }
      }
    },

    [`has${capitalize(key)}`]: {
      get(this: Controller): boolean {
        return defaultValue != undefined || this.data.has(key)
      }
    }
  }
}

type ValueDefinition = string | {
  name: string,
  type: "boolean" | "integer" | "float" | "string" | undefined,
  default: any
}

function getWithDefault<T>(key: string, read: Reader, defaultValue: T) {
  return function(this: Controller): T {
    const value = this.data.get(key)
    return value == null ? defaultValue : read(value)
  }
}

function getOrThrow<T>(key: string, read: Reader) {
  return function(this: Controller): T {
    const value = this.data.get(key)
    if (value == null) {
      const attributeName = this.data.getAttributeNameForKey(key)
      throw new Error(`Missing required attribute "${attributeName}"`)
    }
    return read(value)
  }
}

type Reader = (value: string) => any

const readers: { [type: string]: Reader } = {
  boolean(value: string): boolean {
    return !(value == "0" || value == "false")
  },

  integer(value: string): number {
    return parseInt(value, 10)
  },

  float(value: string): number {
    return parseFloat(value)
  },

  string(value: string): string {
    return value
  }
}
