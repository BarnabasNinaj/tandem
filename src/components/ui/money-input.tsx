import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { parseLocaleNumber } from '@/lib/number'
import { Input } from './input'

interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onValueChange: (n: number) => void
}

export function MoneyInput({
  value,
  onValueChange,
  ...props
}: MoneyInputProps) {
  const focused = useRef(false)
  const [text, setText] = useState(value ? String(value) : '')

  useEffect(() => {
    if (!focused.current) {
      setText(value ? String(value) : '')
    }
  }, [value])

  return (
    <Input
      inputMode="decimal"
      {...props}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        setText(e.target.value)
        onValueChange(parseLocaleNumber(e.target.value))
      }}
      onBlur={() => {
        focused.current = false
        const n = parseLocaleNumber(text)
        onValueChange(n)
        setText(n ? String(n) : '')
      }}
    />
  )
}
