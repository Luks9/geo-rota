import React from 'react'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function SearchInput({ value, onChange, placeholder = 'Pesquisar...' }: SearchInputProps) {
  return (
    <div className="field is-pulled-right" style={{ maxWidth: '220px' }}>
      <p className="control has-icons-left">
        <input
          className="input is-small"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="icon is-left is-small">
          <i className="fas fa-search" />
        </span>
      </p>
    </div>
  )
}

export default SearchInput
