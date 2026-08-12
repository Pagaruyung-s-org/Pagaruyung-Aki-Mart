import React, { useState, useEffect, ChangeEvent } from 'react'
import { Input } from './Input'

interface InputCurrencyProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: number | ''
  onChange: (val: number | '') => void
}

export function InputCurrency({ value, onChange, ...props }: InputCurrencyProps) {
  // Store the formatted string in local state
  const [displayValue, setDisplayValue] = useState<string>('')

  // Sync prop value to display value
  useEffect(() => {
    if (value === '' || value === 0) {
      if (value === 0 && displayValue !== '0') {
        setDisplayValue('0')
      } else if (value === '') {
        setDisplayValue('')
      }
    } else {
      // Format number to local string with dots
      const formatted = new Intl.NumberFormat('id-ID').format(value)
      // Only update if it actually changed to prevent cursor jumping (though cursor management is tricky with simple inputs)
      if (formatted !== displayValue) {
        setDisplayValue(formatted)
      }
    }
  }, [value])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value

    // Remove all non-digit characters
    const digitsOnly = rawValue.replace(/\D/g, '')

    if (digitsOnly === '') {
      setDisplayValue('')
      onChange('')
      return
    }

    // Convert to number
    const numValue = parseInt(digitsOnly, 10)
    
    // Format for display
    const formatted = new Intl.NumberFormat('id-ID').format(numValue)
    setDisplayValue(formatted)
    
    // Pass the actual number back to parent
    onChange(numValue)
  }

  return (
    <>
      {props.name && (
        <input type="hidden" name={props.name} value={value} />
      )}
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        name={undefined} // Remove name from the visible input so it doesn't submit formatted string
      />
    </>
  )
}
