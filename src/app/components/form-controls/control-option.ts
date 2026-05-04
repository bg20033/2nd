export type ControlOptionPrimitive = string | boolean;

export interface OptionValue<T extends ControlOptionPrimitive = ControlOptionPrimitive> {
  value: T;
  label: string;
}
